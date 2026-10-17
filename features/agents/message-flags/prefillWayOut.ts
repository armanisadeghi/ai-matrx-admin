/**
 * Prefill way-outs (builder authoring). Lives here until `@ai-matrx/chat`
 * publishes it; the verdict itself comes from the package's `prefillVerdict`.
 */
import type { FlagVerdict } from "@ai-matrx/chat/agents/message-flags/flags";

interface FlaggedMessage {
  role: string;
  content: unknown;
  flags?: Record<string, boolean | undefined>;
}

function hasFlag(m: FlaggedMessage, flag: string): boolean {
  return m.flags?.[flag] === true;
}

function textOf(message: FlaggedMessage): string {
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((b) =>
      b && typeof b === "object" && (b as { type?: unknown }).type === "text"
        ? String((b as { text?: unknown }).text ?? "")
        : "",
    )
    .join("");
}

/**
 * The way-out for a prefill the selected model cannot take: take the flagged
 * trailing assistant message OUT of the conversation and say its text in the
 * instructions instead ("Begin your reply with exactly: …"). Pure; returns the
 * same list when there is no prefill to move. Adds a system message when the
 * agent has none.
 */
export function movePrefillIntoInstructions<T extends FlaggedMessage>(messages: readonly T[]): T[] {
  const index = messages.length - 1;
  const prefill = messages[index];
  if (!prefill || prefill.role !== "assistant" || !hasFlag(prefill, "prefill")) return [...messages];
  const text = textOf(prefill).trimEnd();
  if (!text.trim()) return messages.slice(0, index);
  const sentence = `Begin your reply with exactly the following text, then continue it naturally:\n${text}`;
  const rest = messages.slice(0, index);
  const sysIndex = rest.findIndex((m) => m.role === "system");
  if (sysIndex < 0) {
    return [{ role: "system", content: [{ type: "text", text: sentence }] } as unknown as T, ...rest];
  }
  const system = rest[sysIndex];
  const blocks = Array.isArray(system.content)
    ? [...(system.content as unknown[])]
    : [{ type: "text", text: String(system.content ?? "") }];
  blocks.push({ type: "text", text: `\n\n${sentence}` });
  return rest.map((m, i) => (i === sysIndex ? ({ ...m, content: blocks } as T) : m));
}

/** The sentence an author reads under a prefill the model cannot take; null when nothing is wrong. */
export function prefillWarning(verdict: FlagVerdict): string | null {
  if (verdict.verdict === "converted" || verdict.verdict === "refused") return verdict.reason;
  return null;
}

