/**
 * Prompt block tokens — pure text helpers. `{{<name>}}` is a prompt block the agent declares; the
 * server replaces it on the first turn with `<name>\n…\n</name>`. `{{!<name>}}` is the author's
 * escaped example and stays plain text. Variables (`{{name}}`) are never touched here.
 */

export const BLOCK_NAME_PATTERN = "[a-z][a-z0-9_-]{0,63}";
export const BLOCK_NAME_RE = new RegExp(`^${BLOCK_NAME_PATTERN}$`);

function tokenRe(): RegExp {
  return new RegExp(`\\{\\{<(${BLOCK_NAME_PATTERN})>\\}\\}`, "g");
}

export interface BlockTextSegment {
  kind: "text" | "block";
  text: string;
  /** Set when `kind` is "block". */
  name?: string;
}

export function isValidBlockName(name: string): boolean {
  return BLOCK_NAME_RE.test(name);
}

export function blockToken(name: string): string {
  return `{{<${name}>}}`;
}

/** Lower-cases a label into a valid block name ("Research rules!" -> "research_rules"). */
export function toBlockName(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^[^a-z]+/, "")
    .replace(/_+/g, "_")
    .replace(/_$/, "")
    .slice(0, 64);
  return slug;
}

/** Every distinct block name used in `text`, in order of first appearance. */
export function blockNamesInText(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(tokenRe())) seen.add(match[1]);
  return Array.from(seen);
}

/** Cuts `text` into plain runs and block tokens; every byte is kept. */
export function splitBlockText(text: string): BlockTextSegment[] {
  const out: BlockTextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(tokenRe())) {
    const start = match.index ?? 0;
    if (start > cursor) out.push({ kind: "text", text: text.slice(cursor, start) });
    out.push({ kind: "block", text: match[0], name: match[1] });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) out.push({ kind: "text", text: text.slice(cursor) });
  return out;
}

export type BlockChipState = "ok" | "undeclared" | "missing";

/**
 * How a token in the prompt reads: declared and found -> ok; declared but nothing resolves ->
 * missing (the run would be refused); used but not declared -> undeclared (left as written).
 */
export function blockChipState(
  name: string,
  declared: ReadonlySet<string>,
  missing: ReadonlySet<string>,
): BlockChipState {
  if (!declared.has(name)) return "undeclared";
  return missing.has(name) ? "missing" : "ok";
}

export interface TypedTrigger {
  /** Index of the `{{<`. */
  start: number;
  /** What was typed after it. */
  query: string;
}

/** `{{<res` right before the caret: the picker's trigger. Null when the caret is elsewhere. */
export function typedTriggerAt(text: string, caret: number): TypedTrigger | null {
  const before = text.slice(0, caret);
  const match = /\{\{<([a-z0-9_-]*)$/.exec(before);
  if (!match) return null;
  return { start: match.index, query: match[1] };
}

/** The new text and caret after the picker chose `name` for a typed trigger (or at the caret). */
export function applyBlockInsert(
  text: string,
  from: number,
  to: number,
  name: string,
  trigger: TypedTrigger | null,
): { text: string; caret: number } {
  const token = blockToken(name);
  const start = trigger ? trigger.start : from;
  const end = trigger ? Math.max(to, from) : to;
  return { text: text.slice(0, start) + token + text.slice(end), caret: start + token.length };
}

export interface DeclaredBlock {
  name: string;
}

/** Normalises the stored `prompt_blocks` jsonb into names (unknown shapes are dropped, not guessed). */
export function declaredNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const name = typeof item === "string" ? item : (item as { name?: unknown } | null)?.name;
    if (typeof name === "string" && isValidBlockName(name) && !out.includes(name)) out.push(name);
  }
  return out;
}

export function withDeclared(value: unknown, name: string): DeclaredBlock[] {
  const names = declaredNames(value);
  if (!names.includes(name)) names.push(name);
  return names.map((n) => ({ name: n }));
}

export function withoutDeclared(value: unknown, name: string): DeclaredBlock[] {
  return declaredNames(value)
    .filter((n) => n !== name)
    .map((n) => ({ name: n }));
}
