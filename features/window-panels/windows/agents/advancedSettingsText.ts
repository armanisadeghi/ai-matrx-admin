/**
 * The one line under "Long cache", for the agent's current model. Mirrors the
 * server mapping in aidream `matrx_ai/config/cache_marks.py` (provider facts:
 * common-docs projects/agent-evaluation/research/provider-caching.md).
 */

/** OpenAI models that take `prompt_cache_retention: "24h"` (server list, 2026-10-16). */
const OPENAI_EXTENDED_RETENTION_MODELS = [
  "gpt-5.5",
  "gpt-5.5-pro",
  "gpt-5.4",
  "gpt-5.2",
  "gpt-5.1",
  "gpt-5.1-codex",
  "gpt-5.1-codex-mini",
  "gpt-5.1-codex-max",
  "gpt-5.1-chat-latest",
  "gpt-5",
  "gpt-5-codex",
  "gpt-4.1",
];

export function openaiTakesLongCache(modelName: string | null): boolean {
  const name = (modelName ?? "").trim().toLowerCase();
  return OPENAI_EXTENDED_RETENTION_MODELS.some((m) => name === m || name.startsWith(`${m}-20`));
}

export function longCacheLine(
  wireFormat: string | null,
  modelName: string | null,
  hasModel: boolean,
): string {
  if (!hasModel) return "Pick a model first";
  if (!wireFormat) return "Checking this model…";
  if (wireFormat === "anthropic_chat") return "Keep the fixed part cached for 1 hour";
  if (wireFormat === "openai_chat" && openaiTakesLongCache(modelName)) {
    return "Keep the fixed part cached for 24 hours";
  }
  return "No effect on this model";
}
