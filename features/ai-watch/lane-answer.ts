import { KIND_KEY } from "@ai-matrx/content-ir";

/**
 * What a workflow step's call shows while it streams (MKT-122): prose is shown as written, but text that is a
 * kind's JSON being written (`{"__kind": ...`, a ```json fence) never is. That text is the forming value's
 * transport; the person reads the value it forms, shaped, not braces and keys arriving one by one.
 */
export function isKindJsonText(raw: string): boolean {
  const text = raw.trimStart();
  if (!text) return false;
  if (/^```json\b/i.test(text)) return true;
  if (/^[\[{]/.test(text)) return true;
  return text.includes(`"${KIND_KEY}"`);
}

/** A forming value as readable rows: `[label, text]` for scalars, nested entries indented by `depth`. */
export interface FormingRow {
  depth: number;
  label: string | null;
  text: string | null;
}


export function formingRows(value: unknown, depth = 0, label: string | null = null): FormingRow[] {
  if (value === null || value === undefined || value === "") return [];
  if (typeof value !== "object") return [{ depth, label, text: String(value) }];
  if (Array.isArray(value)) {
    const scalars = value.every((v) => typeof v !== "object" || v === null);
    if (scalars) {
      const text = value.filter((v) => v !== null && v !== "").join(", ");
      return text ? [{ depth, label, text }] : [];
    }
    return [
      ...(label ? [{ depth, label, text: null }] : []),
      ...value.flatMap((v) => formingRows(v, label ? depth + 1 : depth)),
    ];
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([k]) => !k.startsWith("__"));
  const children = entries.flatMap(([k, v]) => formingRows(v, label ? depth + 1 : depth, k.replace(/_/g, " ")));
  return label ? [{ depth, label, text: null }, ...children] : children;
}

/**
 * A finished call's recorded answer (MKT-126): kind JSON (bare or fenced, with or without prose around it) becomes
 * readable rows; anything else is prose (`rows` null). Returns null `rows` when no JSON object can be read.
 */
export function recordedAnswerRows(text: string): { prose: string; rows: FormingRow[] | null } {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : text.slice(Math.max(0, text.indexOf("{")));
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const value = JSON.parse(candidate.slice(start, end + 1));
      if (value && typeof value === "object") {
        const prose = (fence ? text.replace(fence[0], "") : text.slice(0, text.indexOf("{"))).trim();
        return { prose, rows: formingRows(value) };
      }
    } catch {
      /* not JSON: fall through to prose */
    }
  }
  return { prose: text.trim(), rows: null };
}
