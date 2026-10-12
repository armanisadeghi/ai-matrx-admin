/**
 * Data to model — the provision builder (pure).
 *
 * Two ways a model gets fetched records:
 *   - HANDED OVER: we put the records in the first user message (`buildHandedOver`), with knobs for
 *     fields, records per input, shape and order.
 *   - MODEL FETCHES: the model calls the registered `site_data` tool; `toolResultFor` mirrors what
 *     one call returns to the model (aidream `matrx_ai/tools/implementations/site_data.py` +
 *     `matrx_scraper/features/site_data.py::render_records`): the JSON result with a markdown
 *     `rendering` (16,000-char cap) AND every raw record, fitted to 45,000 chars.
 *
 * Token counts come from the ONE estimator (`@ai-matrx/kit/tokens`) and are always estimates.
 */

import { estimateTokensForText } from "@ai-matrx/kit/tokens";

export type LabRecord = Record<string, unknown>;

export interface InputGroup {
  /** What the records were fetched for (the input link, else a company name). */
  key: string;
  label: string;
  records: LabRecord[];
}

export type ValueKind = "text" | "number" | "date" | "bool" | "object";

export interface FieldStat {
  name: string;
  kind: ValueKind;
  /** Records with a non-empty value. */
  filled: number;
  /** Characters of this field across every record (JSON for objects). */
  chars: number;
}

export type Ordering = "as_fetched" | "newest" | "oldest" | "lowest_rated" | "highest_rated";
export type Shape = "json" | "markdown" | "digest";

export interface HandedOverKnobs {
  fields: string[];
  perInput: number;
  shape: Shape;
  ordering: Ordering;
  /** Each text value is cut to this many characters (0 = no cut). */
  fieldChars: number;
}

/** Fields the fetch adds about itself, never about the thing fetched. */
export const SKIP_FIELDS = new Set(["input", "timestamp", "discovery_input"]);

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function kindOf(v: unknown): ValueKind {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "string") return DATE_RE.test(v) ? "date" : "text";
  return "object";
}

export function valueText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export function charsOf(records: LabRecord[]): number {
  return records.reduce((n, r) => n + JSON.stringify(r).length, 0);
}

/** Every field seen, in first-seen order, with how often it is filled and how big it is. */
export function fieldStats(records: LabRecord[]): FieldStat[] {
  const out = new Map<string, FieldStat>();
  for (const r of records) {
    for (const [name, v] of Object.entries(r)) {
      if (SKIP_FIELDS.has(name)) continue;
      let s = out.get(name);
      if (!s) {
        s = { name, kind: kindOf(v), filled: 0, chars: 0 };
        out.set(name, s);
      }
      if (isEmpty(v)) continue;
      if (s.filled === 0) s.kind = kindOf(v);
      s.filled += 1;
      s.chars += valueText(v).length;
    }
  }
  return [...out.values()];
}

function hostOf(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/review\//, "").replace(/\/$/, "");
    return path && path !== u.pathname ? path : u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The input a record answers: `input.url`, else its own link's company, else its company name. */
export function inputKeyOf(r: LabRecord): string {
  const input = r.input && typeof r.input === "object" ? (r.input as Record<string, unknown>) : null;
  if (input && typeof input.url === "string" && input.url) return input.url;
  for (const k of ["company_url", "company_name", "company", "business_name", "name"]) {
    if (typeof r[k] === "string" && (r[k] as string).trim()) return (r[k] as string).trim();
  }
  if (typeof r.url === "string" && r.url) return r.url.replace(/#.*$/, "");
  return "records";
}

/** Records grouped by the input they were fetched for, in first-seen order. */
export function groupByInput(records: LabRecord[]): InputGroup[] {
  const groups = new Map<string, InputGroup>();
  for (const r of records) {
    const key = inputKeyOf(r);
    let g = groups.get(key);
    if (!g) {
      g = { key, label: /^https?:\/\//.test(key) ? hostOf(key) : key, records: [] };
      groups.set(key, g);
    }
    g.records.push(r);
  }
  return [...groups.values()];
}

const DATE_FIELDS = /(^|_)(date|published|created|time|posted)(_|$)/i;
const RATING_FIELDS = /(^|_)(rating|stars?|score)(_|$)/i;

/** The record's date field (the first filled field whose name says date and whose value parses). */
export function dateFieldOf(records: LabRecord[]): string | null {
  const first = records.find(Boolean);
  if (!first) return null;
  for (const k of Object.keys(first)) {
    if (!DATE_FIELDS.test(k) || /experience/i.test(k)) continue;
    if (records.some((r) => typeof r[k] === "string" && !Number.isNaN(Date.parse(r[k] as string)))) return k;
  }
  return null;
}

/** The record's own rating field (company-wide ratings are skipped). */
export function ratingFieldOf(records: LabRecord[]): string | null {
  const first = records.find(Boolean);
  if (!first) return null;
  const candidates = Object.keys(first).filter((k) => RATING_FIELDS.test(k) && !/company|overall|total|average/i.test(k));
  return candidates.find((k) => records.some((r) => Number.isFinite(Number(r[k])))) ?? null;
}

export function orderRecords(records: LabRecord[], ordering: Ordering): LabRecord[] {
  if (ordering === "as_fetched") return [...records];
  const out = [...records];
  if (ordering === "newest" || ordering === "oldest") {
    const f = dateFieldOf(records);
    if (!f) return out;
    const t = (r: LabRecord) => Date.parse(String(r[f] ?? "")) || 0;
    out.sort((a, b) => (ordering === "newest" ? t(b) - t(a) : t(a) - t(b)));
    return out;
  }
  const f = ratingFieldOf(records);
  if (!f) return out;
  const n = (r: LabRecord) => Number(r[f]) || 0;
  out.sort((a, b) => (ordering === "lowest_rated" ? n(a) - n(b) : n(b) - n(a)));
  return out;
}

/** Each input's records ordered, then cut to `perInput`. */
export function trimGroups(groups: InputGroup[], knobs: Pick<HandedOverKnobs, "perInput" | "ordering">): InputGroup[] {
  const per = Math.max(0, Math.floor(knobs.perInput));
  return groups.map((g) => ({ ...g, records: orderRecords(g.records, knobs.ordering).slice(0, per) }));
}

function cut(s: string, n: number): string {
  return n > 0 && s.length > n ? `${s.slice(0, n)}…` : s;
}

/** Only the chosen fields, in the chosen order; empty values dropped; text cut to `fieldChars`. */
export function pickFields(r: LabRecord, fields: string[], fieldChars: number): LabRecord {
  const out: LabRecord = {};
  for (const f of fields) {
    const v = r[f];
    if (isEmpty(v)) continue;
    out[f] = typeof v === "string" ? cut(v, fieldChars) : v;
  }
  return out;
}

function digestOf(g: InputGroup, fields: string[], fieldChars: number): string {
  const lines: string[] = [];
  const rating = ratingFieldOf(g.records);
  const date = dateFieldOf(g.records);
  if (rating) {
    const vals = g.records.map((r) => Number(r[rating])).filter(Number.isFinite);
    if (vals.length) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const dist = [5, 4, 3, 2, 1].map((s) => `${s}★ ${vals.filter((v) => Math.round(v) === s).length}`).join(", ");
      lines.push(`Average ${rating}: ${avg.toFixed(2)} over ${vals.length} (${dist})`);
    }
  }
  if (date) {
    const ts = g.records.map((r) => Date.parse(String(r[date] ?? ""))).filter((t) => t > 0);
    if (ts.length) {
      const d = (t: number) => new Date(t).toISOString().slice(0, 10);
      lines.push(`Dates: ${d(Math.min(...ts))} to ${d(Math.max(...ts))}`);
    }
  }
  for (const r of g.records) {
    const p = pickFields(r, fields, fieldChars);
    const line = Object.values(p).map(valueText).join(" · ");
    if (line) lines.push(`- ${line}`);
  }
  return lines.join("\n");
}

function markdownOf(r: LabRecord, i: number): string {
  const lines = [`### ${i}.`];
  for (const [k, v] of Object.entries(r)) lines.push(`- **${k}**: ${valueText(v)}`);
  return lines.join("\n");
}

export interface HandedOverPart {
  label: string;
  records: number;
  chars: number;
  tokens: number;
}

export interface HandedOver {
  /** The whole first user message: the question, then the data. */
  text: string;
  dataText: string;
  recordsSent: number;
  chars: number;
  tokens: number;
  parts: HandedOverPart[];
}

/** The first user message for HANDED OVER: the question, then each input's records in the chosen shape. */
export function buildHandedOver(groups: InputGroup[], knobs: HandedOverKnobs, question: string): HandedOver {
  const trimmed = trimGroups(groups, knobs);
  const parts: HandedOverPart[] = [];
  const blocks: string[] = [];
  for (const g of trimmed) {
    let body: string;
    if (knobs.shape === "json") {
      body = g.records.map((r) => JSON.stringify(pickFields(r, knobs.fields, knobs.fieldChars))).join("\n");
    } else if (knobs.shape === "markdown") {
      body = g.records.map((r, i) => markdownOf(pickFields(r, knobs.fields, knobs.fieldChars), i + 1)).join("\n\n");
    } else {
      body = digestOf(g, knobs.fields, knobs.fieldChars);
    }
    const block = `## ${g.label} (${g.records.length} record${g.records.length === 1 ? "" : "s"})\n${body}`;
    blocks.push(block);
    parts.push({
      label: g.label,
      records: g.records.length,
      chars: block.length,
      tokens: estimateTokensForText(block, knobs.shape === "json" ? "structured" : "prose"),
    });
  }
  const dataText = blocks.join("\n\n");
  const text = dataText ? `${question.trim()}\n\n${dataText}` : question.trim();
  return {
    text,
    dataText,
    recordsSent: trimmed.reduce((n, g) => n + g.records.length, 0),
    chars: text.length,
    tokens: estimateTokensForText(text, knobs.shape === "json" ? "structured" : "prose"),
    parts,
  };
}

// ── Model fetches: what one `site_data` call returns ─────────────────────────────────────────

/** Mirrors of the server's caps (see the file header). */
export const SITE_DATA_RENDER_CHARS = 16_000;
export const SITE_DATA_RESULT_CHARS = 45_000;
const FIELD_CHARS = 600;
const LIST_ITEMS = 8;
const TITLE_KEYS = ["name", "title", "job_title", "company_name", "product_name", "business_name", "question", "headline", "place_name", "advertiser_name"];

function scalar(v: unknown): string {
  const s = String(typeof v === "object" ? JSON.stringify(v) : v).trim().replace(/\n/g, " ");
  return s.length <= FIELD_CHARS ? s : `${s.slice(0, FIELD_CHARS)}…`;
}

function renderValue(v: unknown, depth: number): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if (depth >= 2) return scalar(Object.fromEntries(Object.entries(o).filter(([, x]) => !isEmpty(x))));
    return Object.entries(o)
      .filter(([, x]) => !isEmpty(x))
      .map(([k, x]) => `${k}: ${renderValue(x, depth + 1)}`)
      .join("; ");
  }
  if (Array.isArray(v)) {
    const items = v.filter((x) => !isEmpty(x));
    const shown = items.slice(0, LIST_ITEMS).map((x) => renderValue(x, depth + 1));
    const more = items.length > LIST_ITEMS ? ` (+${items.length - LIST_ITEMS} more)` : "";
    if (items.length && items[0] && typeof items[0] === "object") return shown.map((s) => `\n  - ${s}`).join("") + more;
    return shown.join(", ") + more;
  }
  return scalar(v);
}

function renderOne(r: LabRecord, i: number): string {
  const titleKey = TITLE_KEYS.find((k) => !isEmpty(r[k]));
  const lines = [`### ${i}. ${titleKey ? scalar(r[titleKey]) : `Record ${i}`}`];
  for (const [k, v] of Object.entries(r)) {
    if (isEmpty(v) || SKIP_FIELDS.has(k)) continue;
    lines.push(`- **${k}**: ${renderValue(v, 0)}`);
  }
  return lines.join("\n");
}

/** The tool's markdown `rendering`, bounded like the server's (the cut is said in the text). */
export function renderRecords(records: LabRecord[], label: string, limit = SITE_DATA_RENDER_CHARS): { text: string; truncated: boolean } {
  const n = records.length;
  const header = `Live data — ${label} (${n} record${n === 1 ? "" : "s"})`;
  const out = [header, ""];
  let used = header.length + 1;
  for (let i = 1; i <= n; i++) {
    const block = renderOne(records[i - 1], i);
    if (used + block.length + 2 > limit) {
      let shownUpTo = i - 1;
      if (i === 1) {
        out.push(`${block.slice(0, Math.max(limit - used - 120, 200))}…`);
        shownUpTo = 1;
      }
      out.push(`\n[Rendering stopped at ${shownUpTo} of ${n} records (${limit.toLocaleString("en-US")}-character limit); the full records are in \`records\`.]`);
      return { text: out.join("\n"), truncated: true };
    }
    out.push(block, "");
    used += block.length + 2;
  }
  return { text: `${out.join("\n").trimEnd()}\n`, truncated: false };
}

export interface ToolCallPreview {
  args: Record<string, unknown>;
  label: string;
  records: number;
  /** The JSON the model reads back. */
  resultText: string;
  renderingChars: number;
  rawChars: number;
  resultChars: number;
  resultTokens: number;
  /** Records left out of `records` to fit the result size. */
  recordsDropped: number;
}

/** One plausible call per input: `{url, max_records}` (the tool's own args), and what it returns. */
export function toolCallsFor(groups: InputGroup[], perInput: number, sourceKey: string, sourceLabel: string): ToolCallPreview[] {
  return groups.map((g) => {
    const records = g.records.slice(0, Math.max(0, perInput));
    const args: Record<string, unknown> = /^https?:\/\//.test(g.key) ? { url: g.key, max_records: perInput } : { site: sourceKey, query: g.key, max_records: perInput };
    return { args, label: g.label, ...toolResultFor(records, sourceKey, sourceLabel) };
  });
}

export function toolResultFor(records: LabRecord[], sourceKey: string, label: string) {
  const rendering = renderRecords(records, label);
  const kept = [...records];
  const output: Record<string, unknown> = {
    status: "success",
    message: "",
    site: sourceKey,
    label,
    record_count: records.length,
    rendering: rendering.text,
    rendering_truncated: rendering.truncated,
    records: kept,
    provenance: { provider: "live_data", engine: "site_data", dataset: sourceKey, label, records_billed: records.length, snapshot_id: null, announcement: `live data, ${label}` },
  };
  while (kept.length && JSON.stringify(output).length > SITE_DATA_RESULT_CHARS) kept.pop();
  const dropped = records.length - kept.length;
  if (dropped > 0) {
    output.records_included = kept.length;
    output.records_note = `${dropped} of ${records.length} records were left out of \`records\` to fit the result size; every record is summarized in \`rendering\` up to its own limit.`;
  }
  const resultText = JSON.stringify(output);
  return {
    records: records.length,
    resultText,
    renderingChars: rendering.text.length,
    rawChars: JSON.stringify(kept).length,
    resultChars: resultText.length,
    resultTokens: estimateTokensForText(resultText, "structured"),
    recordsDropped: dropped,
  };
}

// ── Decision row: which fields did the answer use? ───────────────────────────────────────────

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "have", "was", "are", "not", "but", "you", "they", "very", "just", "all", "our", "their", "there"]);

function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

export interface FieldUse {
  field: string;
  /** Records whose value for this field shares a distinctive phrase or number with the answer. */
  hits: number;
  sent: number;
}

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Heuristic: a field counts as USED for a record when the answer repeats its value — a number,
 * date or short text as a whole word, long text by sharing ≥ 3 distinctive words. Values too short
 * to tell (yes/no, "US", a 1-digit rating) are not measured: `sent` counts only measurable values.
 */
export function fieldsUsed(answer: string, records: LabRecord[], fields: string[]): FieldUse[] {
  const lower = answer.toLowerCase();
  const answerWords = words(answer);
  return fields.map((field) => {
    let hits = 0;
    let sent = 0;
    for (const r of records) {
      const v = r[field];
      if (isEmpty(v) || typeof v === "boolean") continue;
      const full = valueText(v).toLowerCase().trim();
      const t = DATE_RE.test(full) ? full.slice(0, 10) : full;
      if (t.length < 3) continue;
      sent += 1;
      if (typeof v === "number" || DATE_RE.test(full) || t.length <= 40) {
        if (new RegExp(`(^|[^a-z0-9])${escapeRe(t)}([^a-z0-9]|$)`).test(lower)) hits += 1;
        continue;
      }
      let shared = 0;
      for (const w of words(t)) if (answerWords.has(w) && ++shared >= 3) break;
      if (shared >= 3) hits += 1;
    }
    return { field, hits, sent };
  });
}

// ── Money ──────────────────────────────────────────────────────────────────────────────────────

export interface TokenPrice {
  /** USD per 1M input tokens. */
  input: number | null;
  /** USD per 1M output tokens. */
  output: number | null;
}

export function modelUsd(price: TokenPrice | null, tokensIn: number, tokensOut: number): number | null {
  if (!price || price.input == null) return null;
  return (tokensIn * price.input + tokensOut * (price.output ?? 0)) / 1_000_000;
}
