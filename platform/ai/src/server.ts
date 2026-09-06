export type AiModelUsage = { tokens: number; requests: number };
export type AvailableAiModel = { name: string; tokens: number; requests: number };
export type OpenAiModelResult = { models: AvailableAiModel[]; live: boolean; trackedTokens?: number; creditLimitTokens?: number; error?: string };

const popularModelOrder = ["gpt-5.4-nano", "gpt-5.4-mini", "gpt-5.4", "gpt-5.5", "gpt-5", "gpt-4o", "gpt-4.1", "o4-mini", "gpt-4o-mini", "gpt-4.1-mini", "o3"];

function popularity(name: string) {
  const exact = popularModelOrder.indexOf(name);
  return exact === -1 ? popularModelOrder.length : exact;
}

/** Server-only model discovery. Keep the provider key out of client bundles. */
export async function listOpenAiModels(usage: Map<string, AiModelUsage> = new Map()): Promise<OpenAiModelResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { models: [], live: false, error: "OPENAI_API_KEY is not configured" };
  try {
    const response = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) throw new Error(`Models request failed (${response.status})`);
    const data = await response.json() as { data?: Array<{ id: string }> };
    const models = (data.data || [])
      .filter((model) => /^(?:gpt-(?:4(?:o|\.1)?|5)|o[134])(?:[-.][\w.]*)?$/i.test(model.id))
      .sort((a, b) => {
        const aUsage = usage.get(a.id) || { tokens: 0, requests: 0 };
        const bUsage = usage.get(b.id) || { tokens: 0, requests: 0 };
        return bUsage.requests - aUsage.requests || bUsage.tokens - aUsage.tokens || popularity(a.id) - popularity(b.id) || a.id.localeCompare(b.id, undefined, { numeric: true });
      })
      .slice(0, 5)
      .map((model) => ({ name: model.id, ...(usage.get(model.id) || { tokens: 0, requests: 0 }) }));
    const parsedCreditLimit = Number(process.env.OPENAI_TOKEN_CREDIT_LIMIT);
    const trackedTokens = Array.from(usage.values()).reduce((total, item) => total + item.tokens, 0);
    return { models, live: true, trackedTokens, ...(Number.isFinite(parsedCreditLimit) && parsedCreditLimit > 0 ? { creditLimitTokens: parsedCreditLimit } : {}) };
  } catch (error) {
    return { models: [], live: false, error: error instanceof Error ? error.message : "Unable to load OpenAI models" };
  }
}
