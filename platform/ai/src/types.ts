export type AiResult<T> = { data: T; error: null } | { data: null; error: { code: string; message: string } };
export type AiRole = "user" | "assistant" | "tool";
export type AiMessage = { id: string; role: AiRole; content: string; createdAt: string; proposal?: Record<string, unknown> };
export type AiConversation = { id: string; appId: string; title: string; model: string; createdAt: string; updatedAt: string; messageCount: number; archived: boolean; hasContext?: boolean; contextVersion?: number };
export type AiConversationResponse = { conversation: AiConversation; messages: AiMessage[] };
export type AiMessageResponse = { conversation?: AiConversation; userMessage: AiMessage; assistantMessage: AiMessage; proposal?: Record<string, unknown> };
export type AiRequestContext = Record<string, unknown>;
export const AI_RETENTION_DAYS = 30;
