/**
 * A TABLE COLUMN "FROM LIVE DATA" — the pure half (plug-in wave 2).
 *
 * A column is an agent-owned (AI) column whose enrichment carries `data_source`
 * `{source_key, input_field, output_field, records_per_row?}`: the server fetches one record page
 * per row (metered into the person's points) and keeps one field. This file decides what is
 * declared, which columns may feed it, and how a run's answer reads. Network and UI live beside it.
 */

export interface LiveColumnSpec {
  sourceKey: string;
  /** The row column (field key) whose value is the page address. */
  inputField: string;
  /** The record field (source output) this column keeps. */
  outputField: string;
}

/** What `enrich_declare` takes: the instruction is a readable sentence; the server runs `data_source`. */
export function declareSpec(spec: LiveColumnSpec, sourceLabel: string, inputLabel: string): Record<string, unknown> {
  return {
    instruction: `From live data: ${fieldLabel(spec.outputField)} of ${sourceLabel}, read from the ${inputLabel} column`,
    inputs: [spec.inputField],
    data_source: { source_key: spec.sourceKey, input_field: spec.inputField, output_field: spec.outputField },
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
export function columnTypeFor(outputField: string): "number" | "text" {
  return NUMERIC.test(outputField.toLowerCase()) ? "number" : "text";
}

export function columnLabelFor(sourceLabel: string, outputField: string): string {
  return `${sourceLabel} - ${fieldLabel(outputField)}`;
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
  recordsPerRowSetting: string;
  maxRowsSetting: string;
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
          recordsPerRowSetting: String(q.records_per_row_setting ?? ""),
          maxRowsSetting: String(q.max_rows_setting ?? ""),
        }
      : null,
  };
}

/** The points a set of quotes adds up to (one per column being filled). */
export function totalPoints(quotes: ReadonlyArray<LiveQuote | null>): number {
  return quotes.reduce((sum, q) => sum + (q?.pointsTotal ?? 0), 0);
}
