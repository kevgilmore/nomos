import type { AiConversation, AiConversationResponse, AiMessage } from "./types";

export type AvailableAiModel = { name: string; tokens: number; requests: number };
export type AvailableAiModelsResult = { models: AvailableAiModel[]; live: boolean; trackedTokens?: number; creditLimitTokens?: number; error?: string };

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const modelCache = new Map<string, { expiresAt: number; value: AvailableAiModelsResult }>();
const modelRequests = new Map<string, Promise<AvailableAiModelsResult>>();
const conversationRequests = new Map<string, Promise<AiConversationResponse>>();

type CacheEnvelope<T> = { savedAt: number; value: T };
type RequestOptions = { force?: boolean };

function cacheKey(appId: string, type: string, id?: string) {
  return `nomos-ai-cache:${type}:${appId}${id ? `:${id}` : ""}`;
}
function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null") as CacheEnvelope<T> | null;
    if (!parsed || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > LOCAL_CACHE_MAX_AGE_MS) return null;
    return parsed.value;
  } catch { return null; }
}
function writeCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value } satisfies CacheEnvelope<T>)); } catch { /* Storage may be disabled or full. */ }
}
function removeCache(key: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
}
function sortConversations(conversations: AiConversation[]) {
  return [...conversations].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/ai${path}`, { ...init, credentials: "include", headers: { "content-type": "application/json", ...init?.headers } });
  const data = await response.json().catch(() => null) as { error?: string } & T;
  if (!response.ok) throw new Error(data?.error || `AI request failed (${response.status})`);
  return data;
}

export function appIdForPage(page: string) { return page.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "app"; }
export function getCachedAvailableModels(appId: string) {
  const cached = modelCache.get(appId);
  if (cached) return cached.value;
  const persisted = readCache<AvailableAiModelsResult>(cacheKey(appId, "models"));
  if (persisted?.live && persisted.models.length) {
    modelCache.set(appId, { expiresAt: Date.now() + MODEL_CACHE_TTL_MS, value: persisted });
    return persisted;
  }
  return null;
}
export function listAvailableModels(appId: string, options: RequestOptions = {}) {
  const cached = options.force ? null : getCachedAvailableModels(appId);
  if (cached) return Promise.resolve(cached);
  const pending = modelRequests.get(appId);
  if (pending) return pending;
  const next = request<AvailableAiModelsResult>(`/models?appId=${encodeURIComponent(appId)}`).then((value) => {
    if (value.live && value.models.length) {
      modelCache.set(appId, { expiresAt: Date.now() + MODEL_CACHE_TTL_MS, value });
      writeCache(cacheKey(appId, "models"), value);
    }
    return value;
  }).finally(() => modelRequests.delete(appId));
  modelRequests.set(appId, next);
  return next;
}
export function getCachedConversations(appId: string) { return sortConversations(readCache<AiConversation[]>(cacheKey(appId, "conversations")) || []); }
export function getCachedConversation(appId: string, conversationId: string) { return readCache<AiConversationResponse>(cacheKey(appId, "conversation", conversationId)); }
export async function listConversations(appId: string, options: RequestOptions = {}) {
  if (!options.force) {
    const cached = getCachedConversations(appId);
    if (cached.length) return { conversations: cached };
  }
  const result = await request<{ conversations: AiConversation[] }>(`/conversations?appId=${encodeURIComponent(appId)}`);
  const conversations = sortConversations(result.conversations);
  writeCache(cacheKey(appId, "conversations"), conversations);
  return { conversations };
}
export function createConversation(appId: string, model?: string) {
  const pending = conversationRequests.get(appId);
  if (pending) return pending;
  const next = request<AiConversationResponse>("/conversations", { method: "POST", body: JSON.stringify({ appId, model }) }).then((result) => {
    writeCache(cacheKey(appId, "conversation", result.conversation.id), result);
    const conversations = getCachedConversations(appId).filter((conversation) => conversation.id !== result.conversation.id);
    writeCache(cacheKey(appId, "conversations"), sortConversations([result.conversation, ...conversations]));
    return result;
  }).finally(() => conversationRequests.delete(appId));
  conversationRequests.set(appId, next);
  return next;
}
export async function getConversation(appId: string, conversationId: string, options: RequestOptions = {}) {
  if (!options.force) {
    const cached = getCachedConversation(appId, conversationId);
    if (cached) return cached;
  }
  const result = await request<AiConversationResponse>(`/conversations/${encodeURIComponent(conversationId)}/messages?appId=${encodeURIComponent(appId)}`);
  writeCache(cacheKey(appId, "conversation", conversationId), result);
  return result;
}
export async function sendMessage(appId: string, conversationId: string, content: string) {
  const result = await request<{ userMessage: AiMessage; assistantMessage: AiMessage }>(`/conversations/${encodeURIComponent(conversationId)}/messages?appId=${encodeURIComponent(appId)}`, { method: "POST", body: JSON.stringify({ content }) });
  const cached = getCachedConversation(appId, conversationId);
  if (cached) {
    const conversation = { ...cached.conversation, title: cached.conversation.messageCount === 0 ? content.slice(0, 72) : cached.conversation.title, updatedAt: result.assistantMessage.createdAt, messageCount: cached.conversation.messageCount + 2 };
    writeCache(cacheKey(appId, "conversation", conversationId), { conversation, messages: [...cached.messages, result.userMessage, result.assistantMessage] });
    const conversations = getCachedConversations(appId).map((item) => item.id === conversationId ? conversation : item);
    writeCache(cacheKey(appId, "conversations"), sortConversations(conversations));
  }
  return result;
}
export async function deleteConversation(appId: string, conversationId: string) {
  await request<void>(`/conversations/${encodeURIComponent(conversationId)}?appId=${encodeURIComponent(appId)}`, { method: "DELETE" });
  removeCache(cacheKey(appId, "conversation", conversationId));
  writeCache(cacheKey(appId, "conversations"), getCachedConversations(appId).filter((conversation) => conversation.id !== conversationId));
}
