import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { approvedEmails, approvedSessionUser } from "./auth.js";

const openAiApiKey = defineSecret("OPENAI_API_KEY");
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MODEL = "gpt-5";
const RESPONSES_MODEL = /^(?:gpt-(?:4(?:o|\.1)?|5)|o[134])(?:[-.][\w.]*)?$/i;

type StoredMessage = { role: "user" | "assistant" | "tool"; content: string; createdAt: Timestamp; expiresAt: Timestamp };
type StoredConversation = { appId: string; title: string; model: string; createdAt: Timestamp; updatedAt: Timestamp; messageCount: number; archived: boolean; expiresAt: Timestamp; requestCount?: number; tokenCount?: number };
type OpenAiModel = { id: string };
type AiModelUsage = { tokens: number; requests: number };
const POPULAR_MODELS = ["gpt-5", "gpt-4o", "gpt-4.1", "gpt-5-mini", "o4-mini", "gpt-4o-mini", "gpt-4.1-mini", "o3"];

function db() { if (!getApps().length) initializeApp(); return getFirestore(); }
function validAppId(value: unknown): value is string { return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value); }
function jsonError(res: { status: (status: number) => { json: (body: unknown) => void } }, status: number, message: string) { res.status(status).json({ error: message }); }
function expiresAt() { return Timestamp.fromMillis(Date.now() + RETENTION_MS); }
function timestampMillis(value: unknown) { return value instanceof Timestamp ? value.toMillis() : value && typeof (value as { toMillis?: unknown }).toMillis === "function" ? (value as { toMillis: () => number }).toMillis() : 0; }
function userRoot(uid: string, appId: string) { return db().collection("users").doc(uid).collection("apps").doc(appId); }
function serializeConversation(id: string, value: StoredConversation) { return { id, appId: value.appId, title: value.title, model: value.model, createdAt: value.createdAt.toDate().toISOString(), updatedAt: value.updatedAt.toDate().toISOString(), messageCount: value.messageCount, archived: value.archived }; }
function serializeMessage(id: string, value: StoredMessage) { return { id, role: value.role, content: value.content, createdAt: value.createdAt.toDate().toISOString() }; }

async function callOpenAi(model: string, messages: Array<{ role: "user" | "assistant"; content: string }>) {
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${openAiApiKey.value()}`, "content-type": "application/json" }, body: JSON.stringify({ model, store: false, instructions: "You are the Nomos assistant. Be concise, useful, and grounded in the app context provided by the user.", input: messages }) });
  const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { total_tokens?: number }; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `OpenAI request failed (${response.status})`);
  const content = data.output?.flatMap((item) => item.content || []).filter((item) => item.type === "output_text" && item.text).map((item) => item.text!.trim()).join("\n").trim();
  const reply = data.output_text?.trim() || content;
  if (!reply) throw new Error("OpenAI returned no assistant text");
  return { reply, tokens: Number(data.usage?.total_tokens || 0) };
}

async function listOpenAiModels(usage: Map<string, AiModelUsage>) {
  const response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${openAiApiKey.value()}` } });
  const data = await response.json() as { data?: OpenAiModel[]; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `OpenAI model request failed (${response.status})`);
  const models = (data.data || [])
    .map((model) => model.id)
    .filter((id) => RESPONSES_MODEL.test(id))
    .sort((a, b) => {
      const aUsage = usage.get(a) || { tokens: 0, requests: 0 };
      const bUsage = usage.get(b) || { tokens: 0, requests: 0 };
      return bUsage.requests - aUsage.requests || bUsage.tokens - aUsage.tokens || (POPULAR_MODELS.indexOf(a) === -1 ? POPULAR_MODELS.length : POPULAR_MODELS.indexOf(a)) - (POPULAR_MODELS.indexOf(b) === -1 ? POPULAR_MODELS.length : POPULAR_MODELS.indexOf(b)) || a.localeCompare(b, undefined, { numeric: true });
    })
    .slice(0, 5)
    .map((name) => ({ name, ...(usage.get(name) || { tokens: 0, requests: 0 }) }));
  const parsedCreditLimit = Number(process.env.OPENAI_TOKEN_CREDIT_LIMIT);
  const trackedTokens = Array.from(usage.values()).reduce((total, item) => total + item.tokens, 0);
  return { models, live: true, trackedTokens, ...(Number.isFinite(parsedCreditLimit) && parsedCreditLimit > 0 ? { creditLimitTokens: parsedCreditLimit } : {}) };
}

async function modelUsage(uid: string, appId: string) {
  const snapshot = await userRoot(uid, appId).collection("conversations").select("model", "tokenCount", "requestCount").get();
  const usage = new Map<string, AiModelUsage>();
  snapshot.docs.forEach((doc) => {
    const value = doc.data();
    const name = typeof value.model === "string" ? value.model : "";
    if (!name) return;
    const current = usage.get(name) || { tokens: 0, requests: 0 };
    usage.set(name, { tokens: current.tokens + Number(value.tokenCount || 0), requests: current.requests + Number(value.requestCount || 0) });
  });
  return usage;
}

export const aiApi = onRequest({ region: "europe-west2", secrets: [openAiApiKey, approvedEmails], cors: false, invoker: "public" }, async (req, res) => {
  const user = await approvedSessionUser(req);
  if (!user) { jsonError(res, 401, "Authentication required"); return; }
  const path = (req.path.replace(/^\/api\/(?:ai|openai)/, "") || "/").replace(/\/+$/, "") || "/";
  if (req.method === "GET" && path === "/models") {
    try {
      const appId = typeof req.query.appId === "string" ? req.query.appId : "";
      res.json(await listOpenAiModels(validAppId(appId) ? await modelUsage(user.id, appId) : new Map()));
    } catch (error) {
      jsonError(res, 502, error instanceof Error ? error.message : "OpenAI models are unavailable");
    }
    return;
  }
  const appId = typeof req.query.appId === "string" ? req.query.appId : typeof req.body?.appId === "string" ? req.body.appId : undefined;
  if (!validAppId(appId)) { jsonError(res, 400, "A valid appId is required"); return; }
  const root = userRoot(user.id, appId);
  const conversations = root.collection("conversations");
  try {
    if (req.method === "GET" && path === "/conversations") {
      const snapshot = await conversations.orderBy("updatedAt", "desc").limit(50).get();
      res.json({ conversations: snapshot.docs.filter((doc) => timestampMillis(doc.data().expiresAt) > Date.now()).map((doc) => serializeConversation(doc.id, doc.data() as StoredConversation)) });
      return;
    }
    if (req.method === "POST" && path === "/conversations") {
      const now = Timestamp.now();
      const expiry = expiresAt();
      const requestedModel = typeof req.body?.model === "string" ? req.body.model : "";
      const model = RESPONSES_MODEL.test(requestedModel) && requestedModel.length < 80 ? requestedModel : process.env.OPENAI_MODEL || DEFAULT_MODEL;
      const ref = conversations.doc();
      const conversation: StoredConversation = { appId, title: "New conversation", model, createdAt: now, updatedAt: now, messageCount: 0, archived: false, expiresAt: expiry };
      await ref.set(conversation);
      res.status(201).json({ conversation: serializeConversation(ref.id, conversation), messages: [] });
      return;
    }
    const match = path.match(/^\/conversations\/([^/]+)(?:\/messages)?$/);
    if (!match) { jsonError(res, 404, "Not found"); return; }
    const conversationRef = conversations.doc(decodeURIComponent(match[1]));
    const conversationDoc = await conversationRef.get();
    if (!conversationDoc.exists || timestampMillis(conversationDoc.data()?.expiresAt) <= Date.now()) { jsonError(res, 404, "Conversation not found"); return; }
    const conversation = conversationDoc.data() as StoredConversation;
    const messagesRef = conversationRef.collection("messages");
    if (req.method === "GET" && path.endsWith("/messages")) {
      const snapshot = await messagesRef.orderBy("createdAt", "asc").limit(200).get();
      res.json({ conversation: serializeConversation(conversationDoc.id, conversation), messages: snapshot.docs.map((doc) => serializeMessage(doc.id, doc.data() as StoredMessage)) });
      return;
    }
    if (req.method === "POST" && path.endsWith("/messages")) {
      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      if (!content || content.length > 20_000) { jsonError(res, 400, "Message must be between 1 and 20,000 characters"); return; }
      const existing = await messagesRef.orderBy("createdAt", "asc").limit(200).get();
      const history = existing.docs
        .map((doc) => doc.data() as StoredMessage)
        .filter((message): message is StoredMessage & { role: "user" | "assistant" } => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: message.content }));
      const now = Timestamp.now();
      // Retention is measured from conversation creation, so active use cannot
      // keep personal conversation data around indefinitely.
      const expiry = conversation.expiresAt;
      const userMessageRef = messagesRef.doc();
      await userMessageRef.set({ role: "user", content, createdAt: now, expiresAt: expiry } satisfies StoredMessage);
      if (conversation.messageCount === 0) await conversationRef.update({ title: content.slice(0, 72), updatedAt: now, messageCount: FieldValue.increment(1), expiresAt: expiry });
      else await conversationRef.update({ updatedAt: now, messageCount: FieldValue.increment(1), expiresAt: expiry });
      try {
        const response = await callOpenAi(RESPONSES_MODEL.test(conversation.model) ? conversation.model : process.env.OPENAI_MODEL || DEFAULT_MODEL, [...history, { role: "user", content }]);
        const assistantRef = messagesRef.doc();
        const assistantCreatedAt = Timestamp.now();
        await assistantRef.set({ role: "assistant", content: response.reply, createdAt: assistantCreatedAt, expiresAt: expiry } satisfies StoredMessage);
        await conversationRef.update({ updatedAt: assistantCreatedAt, messageCount: FieldValue.increment(1), requestCount: FieldValue.increment(1), tokenCount: FieldValue.increment(response.tokens), expiresAt: expiry });
        res.json({ userMessage: serializeMessage(userMessageRef.id, { role: "user", content, createdAt: now, expiresAt: expiry }), assistantMessage: serializeMessage(assistantRef.id, { role: "assistant", content: response.reply, createdAt: assistantCreatedAt, expiresAt: expiry }) });
      } catch (error) {
        res.status(502).json({ error: error instanceof Error ? error.message : "AI service unavailable" });
      }
      return;
    }
    if (req.method === "DELETE" && path === `/conversations/${match[1]}`) {
      const messages = await messagesRef.get();
      for (let index = 0; index < messages.docs.length; index += 400) {
        const batch = db().batch();
        messages.docs.slice(index, index + 400).forEach((message) => batch.delete(message.ref));
        await batch.commit();
      }
      await conversationRef.delete();
      res.status(204).send();
      return;
    }
    jsonError(res, 405, "Method not allowed");
  } catch (error) { console.error(error); jsonError(res, 500, error instanceof Error ? error.message : "AI service failed"); }
});

export const aiRetentionCleanup = onSchedule({ schedule: "every 24 hours", region: "europe-west2", timeZone: "Etc/UTC" }, async () => {
  const snapshot = await db().collectionGroup("conversations").where("expiresAt", "<=", Timestamp.now()).limit(400).get();
  for (const doc of snapshot.docs) {
    const messages = await doc.ref.collection("messages").get();
    for (let index = 0; index < messages.docs.length; index += 400) {
      const batch = db().batch();
      messages.docs.slice(index, index + 400).forEach((message) => batch.delete(message.ref));
      batch.delete(doc.ref);
      await batch.commit();
    }
    if (messages.empty) await doc.ref.delete();
  }
});
