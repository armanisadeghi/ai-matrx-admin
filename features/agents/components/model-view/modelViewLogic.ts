/**
 * Pure helpers for the builder's Model view. The server returns the run path's
 * own bytes (`system_prompt`, `system_parts`, `turn_blocks`, `messages`); this
 * file only reads them — it never renders, fills or rewrites a prompt.
 */

export interface PreviewPart {
  kind: string;
  text: string;
}

/** One entry of the server's `prompt_blocks` report: which level and variant supplied a block. */
export interface PreviewBlock {
  name: string;
  level: string;
  block_id?: string | null;
  variant_id?: string | null;
  source_kind?: string | null;
  bound_tool?: string | null;
  chars?: number | null;
}

const LEVEL_LABELS: Record<string, string> = {
  personal: "Mine",
  mine: "Mine",
  organization: "Organization",
  org: "Organization",
  system: "System",
};

export function blockLevelLabel(level: string): string {
  return LEVEL_LABELS[level.toLowerCase()] ?? level;
}

export interface ModelViewPreview {
  model: string | null;
  system_prompt: string | null;
  system_parts?: PreviewPart[];
  turn_blocks?: PreviewPart[];
  messages: Array<Record<string, unknown>>;
  tools: string[];
  /** The blocks the server expanded, with the level and variant that supplied each. */
  prompt_blocks?: PreviewBlock[];
}

export interface TextSegment {
  text: string;
  inserted: boolean;
}

/** Shorter values would light up every stray letter; they are not marked. */
export const MIN_MARKED_VALUE_CHARS = 3;

const PLATFORM_LABELS: Record<string, string> = {
  date: "Date",
  org_catalog: "Organizations",
  active_context: "Active context",
  available_context: "Available context",
};

export function platformLabel(kind: string): string {
  return PLATFORM_LABELS[kind] ?? kind;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Cuts `text` into runs, marking the runs that are a variable's value. */
export function splitByValues(
  text: string,
  values: readonly string[],
): TextSegment[] {
  const needles = Array.from(
    new Set(values.filter((v) => v.length >= MIN_MARKED_VALUE_CHARS)),
  ).sort((a, b) => b.length - a.length);
  if (!text || needles.length === 0) return [{ text, inserted: false }];
  const pattern = new RegExp(needles.map(escapeRegExp).join("|"), "g");
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), inserted: false });
    }
    segments.push({ text: match[0], inserted: true });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), inserted: false });
  }
  return segments;
}

/** The text the model reads in one message, parts joined; other parts by type. */
export function messageText(message: Record<string, unknown>): string {
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const p = part as Record<string, unknown>;
      if (typeof p.text === "string") return p.text;
      return typeof p.type === "string" ? `[${p.type}]` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export function valueAsText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** Effective values: the run's values, then the author's edits on top. */
export function effectiveVariables(
  base: Record<string, unknown>,
  edits: Record<string, string>,
): Record<string, unknown> {
  return { ...base, ...edits };
}

/** Declared variables that carry no value, in declaration order. */
export function emptyVariables(
  declared: readonly string[],
  values: Record<string, unknown>,
): string[] {
  return declared.filter((name) => valueAsText(values[name]).trim() === "");
}

/** The exact text the model is sent, for Copy all: system string, then messages. */
export function fullModelText(preview: ModelViewPreview): string {
  const blocks: string[] = [];
  if (preview.system_prompt) blocks.push(`SYSTEM\n${preview.system_prompt}`);
  for (const message of preview.messages) {
    blocks.push(`${String(message.role ?? "").toUpperCase()}\n${messageText(message)}`);
  }
  return blocks.join("\n\n");
}
