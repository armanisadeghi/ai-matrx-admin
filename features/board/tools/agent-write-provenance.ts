/**
 * AGENT WRITE PROVENANCE — a value an agent puts on a person's board names where it came from.
 *
 * Law (Q-01, 2026-10-22): an agent never writes an invented value onto a person's board, and never silently
 * overwrites what the person wrote. Every content-writing board tool (`board_add_tile` with content,
 * `board_update_tile` with content) takes a `source`: the person's own words, a record id, a tool result, a
 * page or file. A write with no real source is REFUSED loudly with the remedy (name the source, or ask the
 * person with `ask_person`) — it never lands, so nothing unverified is ever mixed into a person's confirmed
 * values. A write that has a source lands, the result carries the source back, `board_read` shows it on the
 * tile, and an overwrite of a tile the agent did not make tells the person (with Undo).
 */

/** What a bare `source` may not be: an admission that there is none. */
const NO_SOURCE_WORDS =
  /^(none|n\/a|na|null|nil|unknown|unverified|unsourced|no source|nothing|assumed|assumption|guess|my guess|a guess|made up|invented|estimate|estimated|general knowledge|training data|myself|me|i|ai|the model)\.?$/i;

/** The source an agent named, or undefined when it named none (or named "none"). */
export function sourceOfWrite(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const s = input.trim();
  if (s.length < 6 || NO_SOURCE_WORDS.test(s)) return undefined;
  return s.slice(0, 500);
}

export const SOURCE_PARAM_DESCRIPTION =
  "Where this content comes from: the person's own words (quote them), a record id, a tool result, a page or file you read. Required whenever you write content. Never invent a value: if you have no source, ask the person with ask_person instead. A write with no real source is refused and changes nothing.";

/** The refusal a content write with no source gets (loud, with the remedy). */
export function missingSourceError(tool: string): string {
  return `${tool} was refused and changed nothing: content written to a person's board needs a \`source\` (the person's own words, a record id, a tool result, a page you read). You gave none. If you do not have the value from one of those, ask the person with ask_person; never write a guessed or invented value.`;
}

export interface AgentWriteRecord {
  source: string;
  at: number;
  conversationId?: string;
}
