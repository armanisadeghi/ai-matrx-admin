/**
 * "Get data" — the board's door to the server's data catalog (aidream `services/data_fetch`).
 * Pure: the wire types, the parsers, and the decisions the panel shows (how many, what it costs,
 * which source a pasted address belongs to). Network calls live in `./server.ts`.
 *
 * Contract (server lane, 2026-10-11):
 *   GET  /data-sources                      → { sources, limits }
 *   POST /data-sources/fetch      (NDJSON)  { source_key, url? | inputs?, max_records, table_id? | table_name? }
 *   GET  /data-sources/jobs/{job_id}
 *   POST /data-sources/tables/{table_id}/refresh (NDJSON) { max_records? }
 * Stream: data `{type:"data_fetch_stage", stage, label, current, total}` … then ONE
 * `{type:"data_fetch_result", result}`; a refusal is an `error` event `{code, user_message, limit?}`.
 */

export type DataSourceInputKind = "url" | "keyword";

export interface DataSourceField {
  name: string;
  label: string;
  required: boolean;
  example?: string | null;
  type?: string | null;
}

export interface DataSource {
  key: string;
  label: string;
  group: string;
  input: { kind: DataSourceInputKind; fields: DataSourceField[] };
  example_url?: string | null;
  verified: boolean;
  usd_per_record: number | null;
}

export interface DataLimit {
  value: number;
  /** The setting (knob key) that holds this limit — the "change" link opens it. */
  setting: string;
}

export interface DataSourceCatalog {
  sources: DataSource[];
  limits: { max_records_per_fetch: DataLimit | null; max_inputs_per_fetch: DataLimit | null };
}

export interface DataFetchResult {
  job_id: string;
  table_id: string;
  table_name: string;
  rows_created: number;
  rows_updated: number;
  records_billed: number;
  cost_usd: number;
  columns: string[];
  values_as_text: number;
  limit_applied: { setting: string; value: number } | null;
}

export interface DataFetchProgress {
  label: string;
  current: number | null;
  total: number | null;
  jobId: string | null;
}

/** What the fetch asks for: one address, or one set of keyword fields per input. */
export type DataFetchInput = { url: string } | { inputs: Record<string, string>[] };

/** A refusal the server said in words (HTTP error or in-stream `error` event). */
export class DataFetchRefusal extends Error {
  constructor(
    readonly code: string,
    readonly userMessage: string,
    readonly limit: DataLimit | null = null,
  ) {
    super(userMessage || code);
    this.name = "DataFetchRefusal";
  }
}

// ─── parsing (the wire is untrusted: every field is checked) ─────────────────

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function limitOf(v: unknown): DataLimit | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const value = num(o.value);
  const setting = str(o.setting);
  return value != null && setting ? { value, setting } : null;
}

export function parseCatalog(raw: unknown): DataSourceCatalog {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(o.sources) ? o.sources : [];
  const sources: DataSource[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const key = str(s.key);
    const label = str(s.label);
    if (!key || !label) continue;
    const input = (s.input && typeof s.input === "object" ? s.input : {}) as Record<string, unknown>;
    const kind: DataSourceInputKind = input.kind === "keyword" ? "keyword" : "url";
    const fields = (Array.isArray(input.fields) ? input.fields : []).flatMap((f): DataSourceField[] => {
      if (!f || typeof f !== "object") return [];
      const r = f as Record<string, unknown>;
      const name = str(r.name);
      if (!name) return [];
      return [{ name, label: str(r.label) ?? name, required: r.required === true, example: str(r.example), type: str(r.type) }];
    });
    sources.push({
      key,
      label,
      group: str(s.group) ?? "Other",
      input: { kind, fields: kind === "url" && fields.length === 0 ? [{ name: "url", label: "Link", required: true, example: str(s.example_url) }] : fields },
      example_url: str(s.example_url),
      verified: s.verified === true,
      usd_per_record: num(s.usd_per_record),
    });
  }
  const limits = (o.limits && typeof o.limits === "object" ? o.limits : {}) as Record<string, unknown>;
  return {
    sources,
    limits: {
      max_records_per_fetch: limitOf(limits.max_records_per_fetch),
      max_inputs_per_fetch: limitOf(limits.max_inputs_per_fetch),
    },
  };
}

export function parseResult(raw: unknown): DataFetchResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const tableId = str(r.table_id);
  if (!tableId) return null;
  const applied = limitOf(r.limit_applied);
  return {
    job_id: str(r.job_id) ?? "",
    table_id: tableId,
    table_name: str(r.table_name) ?? "Table",
    rows_created: num(r.rows_created) ?? 0,
    rows_updated: num(r.rows_updated) ?? 0,
    records_billed: num(r.records_billed) ?? 0,
    cost_usd: num(r.cost_usd) ?? 0,
    columns: Array.isArray(r.columns) ? r.columns.filter((c): c is string => typeof c === "string") : [],
    values_as_text: num(r.values_as_text) ?? 0,
    limit_applied: applied,
  };
}

/** One stream event → progress, result, refusal, or nothing. */
export type DataFetchEvent =
  | { kind: "progress"; progress: DataFetchProgress }
  | { kind: "result"; result: DataFetchResult }
  | { kind: "refusal"; refusal: DataFetchRefusal }
  | null;

export function readEvent(evt: unknown): DataFetchEvent {
  if (!evt || typeof evt !== "object") return null;
  const e = evt as { event?: string; data?: Record<string, unknown> };
  const d = e.data ?? {};
  if (e.event === "error") return { kind: "refusal", refusal: refusalOf(d) };
  if (e.event !== "data") return null;
  if (d.type === "data_fetch_stage") {
    const current = num(d.current);
    const total = num(d.total);
    return {
      kind: "progress",
      progress: {
        label: str(d.label) ?? str(d.stage) ?? "Working",
        current: current && current > 0 ? current : null,
        total: total && total > 0 ? total : null,
        jobId: str(d.job_id),
      },
    };
  }
  if (d.type === "data_fetch_result") {
    const result = parseResult(d.result);
    return result ? { kind: "result", result } : null;
  }
  return null;
}

export function refusalOf(d: Record<string, unknown>): DataFetchRefusal {
  return new DataFetchRefusal(
    str(d.code) ?? str(d.error_type) ?? "data_fetch_failed",
    str(d.user_message) ?? str(d.message) ?? "The data could not be fetched.",
    limitOf(d.limit),
  );
}

/** Drain a stream: progress to `onProgress`; the result returned; a refusal thrown after the end. */
export async function consumeDataFetch(
  events: AsyncIterable<unknown>,
  onProgress?: (p: DataFetchProgress) => void,
): Promise<DataFetchResult> {
  let result: DataFetchResult | null = null;
  let refusal: DataFetchRefusal | null = null;
  for await (const evt of events) {
    const read = readEvent(evt);
    if (!read) continue;
    if (read.kind === "progress") onProgress?.(read.progress);
    else if (read.kind === "result") result = read.result;
    else refusal = read.refusal;
  }
  if (refusal) throw refusal;
  if (!result) throw new DataFetchRefusal("data_fetch_no_result", "The fetch ended without a table.");
  return result;
}

/** A job read (`GET /data-sources/jobs/{id}`): still running, done with a result, or refused. */
export type DataJobState =
  | { state: "running"; progress: DataFetchProgress }
  | { state: "done"; result: DataFetchResult }
  | { state: "failed"; refusal: DataFetchRefusal };

export function parseJob(raw: unknown, jobId: string): DataJobState {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const status = str(o.status) ?? "running";
  const result = parseResult(o.result);
  if (result) return { state: "done", result: { ...result, job_id: result.job_id || jobId } };
  if (["failed", "error", "refused", "cancelled"].includes(status)) {
    const err = (o.error && typeof o.error === "object" ? o.error : o) as Record<string, unknown>;
    return { state: "failed", refusal: refusalOf(err) };
  }
  if (["done", "succeeded", "completed", "complete"].includes(status)) {
    return { state: "failed", refusal: new DataFetchRefusal("data_fetch_no_result", "The fetch finished without a table.") };
  }
  const current = num(o.current);
  const total = num(o.total);
  return {
    state: "running",
    progress: {
      label: str(o.label) ?? str(o.stage) ?? "Working",
      current: current && current > 0 ? current : null,
      total: total && total > 0 ? total : null,
      jobId,
    },
  };
}

// ─── decisions the panel shows ───────────────────────────────────────────────

/** The quick choices for "How many". */
export const COUNT_CHOICES = [10, 50, 100, 500] as const;

/** A count the person may ask for: a whole number, at least 1, never above the limit (when known). */
export function capCount(n: number, limit: number | null | undefined): number {
  const whole = Number.isFinite(n) ? Math.floor(n) : 1;
  const floor = Math.max(1, whole);
  return limit != null && limit > 0 ? Math.min(floor, limit) : floor;
}

/** Each quick choice and whether the limit allows it (an over-limit choice is shown, not hidden). */
export function countChoices(limit: number | null | undefined): { value: number; allowed: boolean }[] {
  return COUNT_CHOICES.map((value) => ({ value, allowed: limit == null || value <= limit }));
}

/** USD for `n` records of `source` (null when the source is unpriced). */
export function estimateUsd(source: Pick<DataSource, "usd_per_record"> | null | undefined, n: number): number | null {
  const unit = source?.usd_per_record;
  if (unit == null || !Number.isFinite(unit) || unit < 0 || n <= 0) return null;
  return unit * n;
}

/** The source list grouped (catalog order inside a group) and filtered by a search. */
export function groupSources(
  sources: readonly DataSource[],
  query: string,
): { group: string; sources: DataSource[] }[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (s: DataSource) => {
    const hay = `${s.label} ${s.group} ${s.key.replace(/[_.-]/g, " ")}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  };
  const out: { group: string; sources: DataSource[] }[] = [];
  for (const s of sources) {
    if (!hit(s)) continue;
    const g = out.find((x) => x.group === s.group);
    if (g) g.sources.push(s);
    else out.push({ group: s.group, sources: [s] });
  }
  return out;
}

/** What the fetch body carries for these field values; null + the missing labels when incomplete. */
export function buildInput(
  source: DataSource,
  values: Record<string, string>,
): { input: DataFetchInput | null; missing: string[] } {
  const missing = source.input.fields.filter((f) => f.required && !values[f.name]?.trim()).map((f) => f.label);
  if (missing.length) return { input: null, missing };
  if (source.input.kind === "url") {
    const field = source.input.fields[0];
    const url = (field ? values[field.name] : "")?.trim() ?? "";
    return url ? { input: { url }, missing: [] } : { input: null, missing: [field?.label ?? "Link"] };
  }
  const one: Record<string, string> = {};
  for (const f of source.input.fields) {
    const v = values[f.name]?.trim();
    if (v) one[f.name] = v;
  }
  return { input: { inputs: [one] }, missing: [] };
}

// ─── a pasted address → its catalog source ───────────────────────────────────

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");

/**
 * The catalog source a web address belongs to: same host as the source's example address and, when
 * the example has a path, the same first path segment ("google.com/maps/…" is Google Maps, not
 * Google search). Only url-input sources; a verified source wins over an unverified one.
 */
export function matchSourceForUrl(href: string, sources: readonly DataSource[]): DataSource | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = bareHost(url.hostname);
  const first = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  const matches = sources.filter((s) => {
    if (s.input.kind !== "url" || !s.example_url) return false;
    let ex: URL;
    try {
      ex = new URL(s.example_url);
    } catch {
      return false;
    }
    const exHost = bareHost(ex.hostname);
    if (host !== exHost && !host.endsWith(`.${exHost}`)) return false;
    const exFirst = ex.pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
    return !exFirst || exFirst === first;
  });
  return matches.find((s) => s.verified) ?? matches[0] ?? null;
}
