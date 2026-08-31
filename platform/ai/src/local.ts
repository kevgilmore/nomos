import { getAdminCollection, getAdminFirestore } from "@nomos/db/admin";
import { listOpenAiModels, type AiModelUsage } from "./server";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_MODEL = "gpt-5";
const RESPONSES_MODEL = /^(?:gpt-(?:4(?:o|\.1)?|5)|o[134])(?:[-.][\w.]*)?$/i;

type FirestoreValue = Record<string, unknown>;
type LocalAiRequest = { method: string; path: string; userId: string; appId?: string; body?: FirestoreValue };
export type LocalAiResponse = { status: number; body?: unknown };

function validAppId(value: unknown): value is string { return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value); }
function pathWithoutTrailingSlash(path: string) { return path.length > 1 ? path.replace(/\/+$/, "") : path; }
function timestampMillis(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function") return (value as { toMillis: () => number }).toMillis();
  return typeof value === "string" || typeof value === "number" ? new Date(value).getTime() : 0;
}
function timestampIso(value: unknown) {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate: () => Date }).toDate().toISOString();
  return new Date(value instanceof Date ? value : String(value)).toISOString();
}
function conversationData(id: string, value: FirestoreValue) {
  return {
    id,
    appId: String(value.appId || ""),
    title: String(value.title || "New conversation"),
    model: String(value.model || DEFAULT_MODEL),
    createdAt: timestampIso(value.createdAt),
    updatedAt: timestampIso(value.updatedAt),
    messageCount: Number(value.messageCount || 0),
    archived: Boolean(value.archived),
  };
}
function messageData(id: string, value: FirestoreValue) {
  return {
    id,
    role: value.role === "user" || value.role === "tool" ? value.role : "assistant",
    content: String(value.content || ""),
    createdAt: timestampIso(value.createdAt),
  };
}

async function callOpenAi(model: string, messages: Array<{ role: "user" | "assistant"; content: string }>) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model, store: false, instructions: "You are the Nomos assistant. Be concise, useful, and grounded in the app context provided by the user.", input: messages }),
  });
  const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { total_tokens?: number }; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || `OpenAI request failed (${response.status})`);
  const content = data.output?.flatMap((item) => item.content || []).filter((item) => item.type === "output_text" && item.text).map((item) => item.text!.trim()).join("\n").trim();
  const reply = data.output_text?.trim() || content;
  if (!reply) throw new Error("OpenAI returned no assistant text");
  return { reply, tokens: Number(data.usage?.total_tokens || 0) };
}

export async function handleLocalAiRequest(request: LocalAiRequest): Promise<LocalAiResponse> {
  const path = pathWithoutTrailingSlash(request.path);
  if (request.method === "GET" && path === "/models") {
    const snapshot = await getAdminCollection(`users/${request.userId}/apps/${request.appId || "fitness"}/conversations`).select("model", "tokenCount", "requestCount").get();
    const usage = new Map<string, AiModelUsage>();
    snapshot.docs.forEach((doc) => {
      const value = doc.data();
      const name = typeof value.model === "string" ? value.model : "";
      if (!name) return;
      const current = usage.get(name) || { tokens: 0, requests: 0 };
      usage.set(name, { tokens: current.tokens + Number(value.tokenCount || 0), requests: current.requests + Number(value.requestCount || 0) });
    });
    const result = await listOpenAiModels(usage);
    return { status: result.live ? 200 : 503, body: result };
  }
  if (!validAppId(request.appId)) return { status: 400, body: { error: "A valid appId is required" } };

  const conversations = getAdminCollection(`users/${request.userId}/apps/${request.appId}/conversations`);
  if (request.method === "GET" && path === "/conversations") {
    const snapshot = await conversations.orderBy("updatedAt", "desc").limit(50).get();
    return { status: 200, body: { conversations: snapshot.docs.filter((doc) => timestampMillis(doc.data().expiresAt) > Date.now()).map((doc) => conversationData(doc.id, doc.data())) } };
  }
  if (request.method === "POST" && path === "/conversations") {
    const now = new Date();
    const conversation = {
      appId: request.appId,
      title: "New conversation",
      model: typeof request.body?.model === "string" && RESPONSES_MODEL.test(request.body.model) ? request.body.model : process.env.OPENAI_MODEL || DEFAULT_MODEL,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      archived: false,
      expiresAt: new Date(Date.now() + RETENTION_MS),
    };
    const ref = conversations.doc();
    await ref.set(conversation);
    return { status: 201, body: { conversation: conversationData(ref.id, conversation), messages: [] } };
  }

  const match = path.match(/^\/conversations\/([^/]+)(?:\/messages)?$/);
  if (!match) return { status: 404, body: { error: "Not found" } };
  const conversationRef = conversations.doc(decodeURIComponent(match[1]));
  const conversationSnapshot = await conversationRef.get();
  if (!conversationSnapshot.exists || timestampMillis(conversationSnapshot.data()?.expiresAt) <= Date.now()) return { status: 404, body: { error: "Conversation not found" } };
  const conversation = conversationSnapshot.data() as FirestoreValue;
  const messages = conversationRef.collection("messages");

  if (request.method === "GET" && path.endsWith("/messages")) {
    const snapshot = await messages.orderBy("createdAt", "asc").limit(200).get();
    return { status: 200, body: { conversation: conversationData(conversationSnapshot.id, conversation), messages: snapshot.docs.map((doc) => messageData(doc.id, doc.data())) } };
  }
  if (request.method === "POST" && path.endsWith("/messages")) {
    const content = typeof request.body?.content === "string" ? request.body.content.trim() : "";
    if (!content || content.length > 20_000) return { status: 400, body: { error: "Message must be between 1 and 20,000 characters" } };
    const existing = await messages.orderBy("createdAt", "asc").limit(200).get();
    const history = existing.docs
      .map((doc) => doc.data())
      .filter((message): message is FirestoreValue & { role: "user" | "assistant" } => message.role === "user" || message.role === "assistant")
      .map((message) => ({ role: message.role, content: String(message.content || "") }));
    const expiry = conversation.expiresAt;
    const now = new Date();
    const userMessageRef = messages.doc();
    await userMessageRef.set({ role: "user", content, createdAt: now, expiresAt: expiry });
    const currentCount = Number(conversation.messageCount || 0);
    await conversationRef.update({ title: currentCount === 0 ? content.slice(0, 72) : conversation.title, updatedAt: now, messageCount: currentCount + 1 });
    try {
      const response = await callOpenAi(RESPONSES_MODEL.test(String(conversation.model)) ? String(conversation.model) : process.env.OPENAI_MODEL || DEFAULT_MODEL, [...history, { role: "user", content }]);
      const assistantRef = messages.doc();
      const assistantCreatedAt = new Date();
      await assistantRef.set({ role: "assistant", content: response.reply, createdAt: assistantCreatedAt, expiresAt: expiry });
      await conversationRef.update({ updatedAt: assistantCreatedAt, messageCount: currentCount + 2, requestCount: Number(conversation.requestCount || 0) + 1, tokenCount: Number(conversation.tokenCount || 0) + response.tokens });
      return { status: 200, body: { userMessage: messageData(userMessageRef.id, { role: "user", content, createdAt: now }), assistantMessage: messageData(assistantRef.id, { role: "assistant", content: response.reply, createdAt: assistantCreatedAt }) } };
    } catch (error) {
      return { status: 502, body: { error: error instanceof Error ? error.message : "AI service unavailable" } };
    }
  }
  if (request.method === "DELETE" && path === `/conversations/${match[1]}`) {
    const snapshot = await messages.get();
    for (let index = 0; index < snapshot.docs.length; index += 400) {
      const batch = getAdminFirestore().batch();
      snapshot.docs.slice(index, index + 400).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    await conversationRef.delete();
    return { status: 204 };
  }
  return { status: 405, body: { error: "Method not allowed" } };
}
