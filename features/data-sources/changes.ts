/**
 * "What changed" after a refresh — pure: the wire shapes (aidream `GET /data-sources/jobs/{id}/changes`),
 * their parsers, and the decisions the panel shows (the bar's counts, a numeric delta and its colour,
 * a before → after pair). Nothing here fetches; `./server.ts` and `./hooks.ts` do.
 */

export interface ChangeSummary {
  added: number;
  changed: number;
  /** Null when "gone" could not be judged (the fetch was a full window, not the whole collection). */
  gone: number | null;
  unchanged: number;
  goneChecked: boolean;
  /** The fetch that made the table: there was nothing to compare with. */
  firstFetch: boolean;
}

export interface ChangedKey {
  key: string;
  label: string | null;
  id: string | null;
}

export interface ChangedField {
  field: string;
  type: string;
  before: unknown;
  after: unknown;
}

export interface ChangedRow extends ChangedKey {
  fields: ChangedField[];
  fieldsTotal: number;
}

export interface ChangeSet {
  jobId: string;
  tableId: string | null;
  tableName: string | null;
  summary: ChangeSummary | null;
  keyColumn: string | null;
  added: ChangedKey[];
  changed: ChangedRow[];
  gone: ChangedKey[];
  /** The lists are capped; the counts in `summary` are exact. */
  truncated: boolean;
  goneNote: string | null;
  /** Set when the server could not work the changes out (the records were stored either way). */
  error: string | null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const keyText = (v: unknown): string => (v == null ? "" : typeof v === "string" ? v : String(v));

export function parseSummary(raw: unknown): ChangeSummary | null {
  const r = obj(raw);
  if (!r) return null;
  return {
    added: num(r.added) ?? 0,
    changed: num(r.changed) ?? 0,
    gone: num(r.gone),
    unchanged: num(r.unchanged) ?? 0,
    goneChecked: r.gone_checked === true,
    firstFetch: r.first_fetch === true,
  };
}

function parseKey(raw: unknown): ChangedKey | null {
  const r = obj(raw);
  if (!r) return null;
  return { key: keyText(r.key), label: r.label == null ? null : keyText(r.label), id: str(r.id) };
}

export function parseChangeSet(raw: unknown): ChangeSet | null {
  const r = obj(raw);
  if (!r) return null;
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  return {
    jobId: str(r.job_id) ?? "",
    tableId: str(r.table_id),
    tableName: str(r.table_name),
    summary: parseSummary(r.summary),
    keyColumn: str(r.key_column),
    added: list(r.added).map(parseKey).filter((k): k is ChangedKey => k != null),
    changed: list(r.changed).flatMap((x): ChangedRow[] => {
      const row = parseKey(x);
      const o = obj(x);
      if (!row || !o) return [];
      const fields = list(o.fields).flatMap((f): ChangedField[] => {
        const fo = obj(f);
        return fo && str(fo.field) ? [{ field: str(fo.field) as string, type: str(fo.type) ?? "text", before: fo.before ?? null, after: fo.after ?? null }] : [];
      });
      return [{ ...row, fields, fieldsTotal: num(o.fields_total) ?? fields.length }];
    }),
    gone: list(r.gone).map(parseKey).filter((k): k is ChangedKey => k != null),
    truncated: r.truncated === true,
    goneNote: str(r.gone_note),
    error: str(r.error),
  };
}

/** The bar's counts for a refresh: "12 new · 3 changed · 1 gone". Null for the fetch that made the table. */
export function summaryParts(s: ChangeSummary | null): string[] | null {
  if (!s || s.firstFetch) return null;
  const parts = [`${s.added.toLocaleString()} new`, `${s.changed.toLocaleString()} changed`];
  if (s.gone != null) parts.push(`${s.gone.toLocaleString()} gone`);
  return parts;
}

export function hasChanges(s: ChangeSummary | null): boolean {
  return !!s && !s.firstFetch && (s.added > 0 || s.changed > 0 || (s.gone ?? 0) > 0);
}

export type Direction = "up" | "down" | "same";

export interface FieldDelta {
  /** "▲0.2" / "▼0.2" — null when either side is not a number. */
  delta: string | null;
  direction: Direction;
}

const NUMBER_TYPES = new Set(["number", "integer", "decimal", "currency", "percent", "rating"]);

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Rounds away float noise (4.3 - 4.1 = 0.1999…) to the precision of the two numbers. */
export function fieldDelta(f: Pick<ChangedField, "type" | "before" | "after">): FieldDelta {
  const a = asNumber(f.before);
  const b = asNumber(f.after);
  if (!NUMBER_TYPES.has(f.type) || a == null || b == null) return { delta: null, direction: "same" };
  const places = Math.max(decimals(a), decimals(b));
  const diff = Number((b - a).toFixed(places));
  if (diff === 0) return { delta: null, direction: "same" };
  const body = Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: Math.min(places, 6) });
  return diff > 0 ? { delta: `▲${body}`, direction: "up" } : { delta: `▼${body}`, direction: "down" };
}

function decimals(n: number): number {
  const s = String(n);
  if (s.includes("e-")) return Math.min(Number(s.split("e-")[1]), 10);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

/** One cell's text: empty is "—" (never a blank that reads as no change), long text is already clipped by the server. */
export function showValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return typeof v === "string" ? v : JSON.stringify(v);
}

export type ChangesTab = "added" | "changed" | "gone";

export function tabCounts(s: ChangeSummary | null): Record<ChangesTab, number | null> {
  return { added: s?.added ?? 0, changed: s?.changed ?? 0, gone: s?.gone ?? null };
}

/** The tab to open on: the first with something in it, "changed" when nothing moved. */
export function firstTab(s: ChangeSummary | null): ChangesTab {
  if (!s) return "added";
  if (s.added > 0) return "added";
  if (s.changed > 0) return "changed";
  if ((s.gone ?? 0) > 0) return "gone";
  return "added";
}

/** One past refresh in the history list. */
export interface RefreshRun {
  jobId: string;
  at: string | null;
  status: string;
  recordsBilled: number;
  costUsd: number | null;
  summary: ChangeSummary | null;
}

/** Job rows (newest first) → the history: finished jobs only, each with its change counts. */
export function parseHistory(rows: unknown): RefreshRun[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((x): RefreshRun[] => {
    const r = obj(x);
    const jobId = r && str(r.id);
    if (!r || !jobId || r.status !== "done") return [];
    return [
      {
        jobId,
        at: str(r.finished_at) ?? str(r.created_at),
        status: "done",
        recordsBilled: num(r.records_billed) ?? 0,
        costUsd: num(r.cost_usd) ?? (typeof r.cost_usd === "string" ? asNumber(r.cost_usd) : null),
        summary: parseSummary(obj(r.result)?.changes),
      },
    ];
  });
}
