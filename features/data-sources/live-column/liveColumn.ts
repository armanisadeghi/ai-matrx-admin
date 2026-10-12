/**
 * A TABLE COLUMN "FROM LIVE DATA" — the pure half (plug-in wave 2).
 *
 * A column is an agent-owned (AI) column whose enrichment carries `data_source`
 * `{source_key, input_field, output_field, records_per_row?}`: the server fetches one record page
 * per row (metered into the person's points) and keeps one field. This file decides what is
 * declared, which columns may feed it, and how a run's answer reads. Network and UI live beside it.
 */

/** What a row keeps of the records its page brings in (a many-record source only; a one-record source is always `first`). */
export type LiveKeep = "first" | "average" | "count" | "newest";

export const KEEP_OPTIONS: ReadonlyArray<{ value: LiveKeep; label: string }> = [
  { value: "first", label: "First" },
  { value: "average", label: "Average" },
  { value: "count", label: "Count" },
  { value: "newest", label: "Newest" },
];

export interface LiveColumnSpec {
  sourceKey: string;
  /** The row column (field key) whose value is the page address. */
  inputField: string;
  /** The record field (source output) this column keeps. */
  outputField: string;
  /** Many-record sources only: how the records become one cell, and how many records each row brings in. */
  keep?: LiveKeep;
  recordsPerRow?: number;
}

/** What `enrich_declare` takes: the instruction is a readable sentence; the server runs `data_source`. */
export function declareSpec(spec: LiveColumnSpec, sourceLabel: string, inputLabel: string): Record<string, unknown> {
  return {
    instruction: `From live data: ${fieldLabel(spec.outputField)} of ${sourceLabel}, read from the ${inputLabel} column`,
    inputs: [spec.inputField],
    data_source: {
      source_key: spec.sourceKey,
      input_field: spec.inputField,
      output_field: spec.outputField,
      ...(spec.keep ? { keep: spec.keep, records_per_row: spec.recordsPerRow } : {}),
    },
    enabled: true,
  };
}

/** `employees_in_linkedin` -> `Employees In Linkedin`, the column name a person sees. */
export function fieldLabel(key: string): string {
  return key
    .split(/[\s_\-./]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const NUMERIC = /(^|_)(rating|count|total|num|number|employees|followers|price|rank|score|reviews|stars|amount|size|likes|views)(_|$)/;

/** A new column's type: a number when the record field reads like one, else text. */
export function columnTypeFor(outputField: string, keep: LiveKeep = "first"): "number" | "text" {
  if (keep === "average" || keep === "count") return "number";
  return NUMERIC.test(outputField.toLowerCase()) ? "number" : "text";
}

/** `Trustpilot reviews - Average Review Rating (last 10)`: what the column keeps, in its name. */
export function columnLabelFor(sourceLabel: string, outputField: string, keep: LiveKeep = "first", records = 1): string {
  const word = keep === "first" ? "" : `${KEEP_OPTIONS.find((k) => k.value === keep)?.label ?? ""} `;
  const sample = keep === "first" || records <= 1 ? "" : ` (last ${records})`;
  return `${sourceLabel} - ${word}${fieldLabel(outputField)}${sample}`;
}

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The column of this table that already carries `label` (the store refuses two columns with one label). */
export function existingColumn<F extends { label: string }>(fields: readonly F[], label: string): F | null {
  return fields.find((f) => sameLabel(f.label, label)) ?? null;
}

/** Whether a stored enrichment is a live-data one that reads the same source field (so refilling it is the same ask). */
export function isLiveColumnOf(enrichment: unknown, sourceKey: string, outputField: string): boolean {
  const ds = (enrichment as { data_source?: { source_key?: unknown; output_field?: unknown } } | null)?.data_source;
  return Boolean(ds) && ds?.source_key === sourceKey && ds?.output_field === outputField;
}

/** Whether a record field can be averaged: it reads like a number. */
export function isNumericField(outputField: string): boolean {
  return NUMERIC.test(outputField.toLowerCase());
}

const COMPANY_LEVEL = /(rating|score|stars)/;

/**
 * "Rating" of a review is one person's stars; the COMPANY's rating lives on a company or place source.
 * For a many-record source and a kept field that reads like a company-level figure, the one-record
 * sources (company, place, product) that return a field of the same kind, featured first.
 */
export function companyLevelSources<S extends { key: string; label: string; group?: string; records_are?: string; output_fields?: string[]; input: { kind: string }; featured?: boolean }>(
  outputField: string,
  sources: readonly S[],
  limit = 3,
): Array<{ source: S; field: string }> {
  const hit = COMPANY_LEVEL.exec(outputField.toLowerCase());
  if (!hit) return [];
  const word = hit[1];
  const found: Array<{ source: S; field: string }> = [];
  for (const source of sources) {
    if (source.records_are === "items" || source.input.kind !== "url") continue;
    const field = (source.output_fields ?? []).find((f) => {
      const l = f.toLowerCase();
      return l === word || l === `${word}s` || l.startsWith(`${word}_overall`) || l.startsWith(`${word}s_overall`);
    });
    if (field) found.push({ source, field });
  }
  // A company's or a place's own figure first (the thing the person means), then apps and the rest.
  const rank = (x: { source: S }) => (/compan|place|local|business/i.test(x.source.group ?? "") ? 0 : 1);
  found.sort((a, b) => rank(a) - rank(b) || Number(Boolean(b.source.featured)) - Number(Boolean(a.source.featured)));
  return found.slice(0, limit);
}

/** The row columns that can hold a page address: every column a person types a value into. */
export function addressColumns<F extends { parity_type?: string | null; source?: string | null }>(fields: readonly F[]): F[] {
  const worked = new Set(["formula", "rollup", "lookup", "relation", "files", "image"]);
  return fields.filter((f) => !worked.has(String(f.parity_type ?? "")) && f.source !== "agent");
}

/** The run answer of `POST /v1/tables/{t}/ai-columns/{f}/run`, as the dialog reads it. */
export interface LiveRun {
  rowsSeen: number;
  rowsWritten: number;
  costCents: number;
  says: string;
  quote: LiveQuote | null;
}

export interface LiveQuote {
  rows: number;
  recordsPerRow: number;
  pointsPerRecord: number;
  pointsPerRow: number;
  pointsTotal: number;
  maxRowsPerRun: number;
  /** The organization's ceiling on records per row (0 when the server did not say). */
  maxRecordsPerRow: number;
  recordsPerRowSetting: string;
  maxRowsSetting: string;
  recordsAre: "entity" | "items";
  keep: LiveKeep;
  /** Rows that already hold records paid for by an earlier fill that did not finish writing (0 points now). */
  rowsKept: number;
}

export function parseRun(raw: unknown): LiveRun {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const q = o.quote && typeof o.quote === "object" ? (o.quote as Record<string, unknown>) : null;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    rowsSeen: n(o.rows_seen),
    rowsWritten: n(o.rows_written),
    costCents: n(o.cost_cents),
    says: typeof o.says === "string" ? o.says : "",
    quote: q
      ? {
          rows: n(q.rows),
          recordsPerRow: n(q.records_per_row),
          pointsPerRecord: n(q.points_per_record),
          pointsPerRow: n(q.points_per_row),
          pointsTotal: n(q.points_total),
          maxRowsPerRun: n(q.max_rows_per_run),
          maxRecordsPerRow: n(q.max_records_per_row),
          recordsPerRowSetting: String(q.records_per_row_setting ?? ""),
          maxRowsSetting: String(q.max_rows_setting ?? ""),
          recordsAre: q.records_are === "items" ? "items" : "entity",
          keep: (["first", "average", "count", "newest"] as const).find((k) => k === q.keep) ?? "first",
          rowsKept: n(q.rows_kept),
        }
      : null,
  };
}

/** The points a set of quotes adds up to (one per column being filled). */
export function totalPoints(quotes: ReadonlyArray<LiveQuote | null>): number {
  return quotes.reduce((sum, q) => sum + (q?.pointsTotal ?? 0), 0);
}
