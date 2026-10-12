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

export interface UrlPattern {
  host: string;
  path: string;
}

export interface DataSource {
  key: string;
  label: string;
  group: string;
  input: {
    kind: DataSourceInputKind;
    fields: DataSourceField[];
    /** Keyword-style ways to ask for records without a link: option name → the input fields it needs. */
    discover_options?: Record<string, string[]>;
  };
  example_url?: string | null;
  /** The server's address rule: regexes for the host and the path (the example address is the fallback). */
  url_pattern?: UrlPattern | null;
  /** The record fields this source returns (a table column "From live data" keeps one of them). */
  output_fields?: string[];
  verified: boolean;
  usd_per_record: number | null;
  /** The server's own points price for ONE record of this source (never assume a flat number). */
  points_per_record?: number | null;
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
  /** What named one record in the table: the source's own id, the record's link, or a fingerprint. */
  key_basis?: "source_id" | "url" | "record_hash" | null;
  /** Honest notes about this fetch (a known issue with the source, a fallback record key). */
  notices?: string[];
  /** The fetched records themselves, only when the request asked for `includeRecords` (a card or autofill showing them at once). */
  records?: Record<string, unknown>[];
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

/** `url_pattern` off the wire: a host regex (required) and a path regex (empty = any path). */
export function urlPatternOf(v: unknown): UrlPattern | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const host = str(o.host);
  return host ? { host, path: typeof o.path === "string" ? o.path : "" } : null;
}

/** Host and `path?query`, searched like the server does (a Google place link carries its id in the query). */
function patternMatches(pattern: UrlPattern, url: URL): boolean {
  try {
    return new RegExp(pattern.host, "i").test(url.hostname) && new RegExp(pattern.path, "i").test(`${url.pathname || "/"}${url.search}`);
  } catch {
    return false;
  }
}

/** `discover_options` off the wire: option name → field names (anything else dropped). */
export function discoverOptionsOf(v: unknown): Record<string, string[]> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string[]> = {};
  for (const [name, fields] of Object.entries(v as Record<string, unknown>)) {
    const list = Array.isArray(fields) ? fields.filter((f): f is string => typeof f === "string" && f.trim().length > 0) : [];
    if (name.trim() && list.length) out[name] = list;
  }
  return out;
}

/**
 * One source's own price. The server sends `points_per_record` and `usd_per_record` per source; a
 * source without its own price takes the catalog default (`usd_per_record_default` at the top, with
 * `points_per_usd`). Never a number made up here.
 */
export function resolvePrice(source: Record<string, unknown>, top: Record<string, unknown>): { usd: number | null; points: number | null } {
  const rate = num(top.points_per_usd);
  const usd = num(source.usd_per_record) ?? num(top.usd_per_record_default);
  const points = num(source.points_per_record) ?? (usd != null && rate != null ? Math.ceil(usd * rate - 1e-9) : null);
  return { usd, points };
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
    const price = resolvePrice(s, o);
    sources.push({
      key,
      label,
      group: str(s.group) ?? "Other",
      input: {
        kind,
        fields: kind === "url" && fields.length === 0 ? [{ name: "url", label: "Link", required: true, example: str(s.example_url) }] : fields,
        discover_options: discoverOptionsOf(input.discover_options),
      },
      example_url: str(s.example_url),
      url_pattern: urlPatternOf(s.url_pattern),
      output_fields: Array.isArray(s.output_fields) ? s.output_fields.filter((f): f is string => typeof f === "string") : [],
      verified: s.verified === true,
      usd_per_record: price.usd,
      points_per_record: price.points,
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
    key_basis: r.key_basis === "source_id" || r.key_basis === "url" || r.key_basis === "record_hash" ? r.key_basis : null,
    notices: Array.isArray(r.notices) ? r.notices.filter((n): n is string => typeof n === "string" && n.trim().length > 0) : [],
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
    if (!result) return null;
    if (Array.isArray(d.records)) {
      result.records = d.records.filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r));
    }
    return { kind: "result", result };
  }
  return null;
}

export function refusalOf(d: Record<string, unknown>): DataFetchRefusal {
  const details = d.details && typeof d.details === "object" ? (d.details as Record<string, unknown>) : {};
  return new DataFetchRefusal(
    str(d.code) ?? str(details.code) ?? str(d.error_type) ?? "data_fetch_failed",
    str(d.user_message) ?? str(details.user_message) ?? str(d.message) ?? "The data could not be fetched.",
    limitOf(d.limit) ?? limitOf(details.limit),
  );
}

/** A table's refresh spec: the newest `scraper.data_fetch_job` row for it (read client-direct). */
export interface DataFetchSpec {
  jobId: string;
  sourceKey: string;
  maxRecords: number;
  status: string;
  rowsCreated: number;
  rowsUpdated: number;
  finishedAt: string | null;
  createdAt: string | null;
}

export function parseSpec(row: unknown): DataFetchSpec | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const jobId = str(r.id);
  const sourceKey = str(r.source_key);
  if (!jobId || !sourceKey) return null;
  return {
    jobId,
    sourceKey,
    maxRecords: num(r.max_records) ?? 0,
    status: str(r.status) ?? "",
    rowsCreated: num(r.rows_created) ?? 0,
    rowsUpdated: num(r.rows_updated) ?? 0,
    finishedAt: str(r.finished_at),
    createdAt: str(r.created_at),
  };
}

/** A table made by "Get data", as the Data tile of the Source input lists it. */
export interface FetchedTable {
  tableId: string;
  tableName: string;
  sourceKey: string;
  finishedAt: string | null;
}

/** The newest job per table (rows arrive newest first); jobs with no table yet are skipped. */
export function parseFetchedTables(rows: unknown): FetchedTable[] {
  if (!Array.isArray(rows)) return [];
  const out: FetchedTable[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const tableId = str(r.table_id);
    if (!tableId || seen.has(tableId)) continue;
    seen.add(tableId);
    out.push({
      tableId,
      tableName: str(r.table_name) ?? "Untitled table",
      sourceKey: str(r.source_key) ?? "",
      finishedAt: str(r.finished_at),
    });
  }
  return out;
}

/**
 * "Get more" asks for the SAME spec with a larger `max_records` (the server re-fetches from the top
 * and bills every record it returns — overlap included), so the quote is the FULL new count. Capped
 * at the organization limit (the server lowers anything above it).
 */
export function getMoreCount(currentMax: number, step: number, limit: number | null | undefined): number {
  return capCount(Math.max(1, currentMax) + Math.max(1, step), limit);
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

/** Points for `n` records at the source's OWN points price (null when the server named none). */
export function quotePoints(source: Pick<DataSource, "points_per_record"> | null | undefined, n: number): number | null {
  const unit = source?.points_per_record;
  if (unit == null || !Number.isFinite(unit) || unit < 0 || n <= 0) return null;
  return Math.ceil(Number((unit * n).toFixed(6)));
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

/** The words for a search option's name ("keywords" → "Keywords"). */
export function optionLabel(name: string): string {
  const words = name.replace(/[_.-]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
}

/** The ways a source can be asked without a link ("By search"): empty for a link-only source. */
export function searchOptions(source: Pick<DataSource, "input">): { name: string; fields: DataSourceField[] }[] {
  if (source.input.kind !== "url") return [];
  // The option people usually want first: one that takes words (keyword, query, search), then a place (location, country).
  const rank = (names: string[]) => (names.some((n) => /keyword|query|search/i.test(n)) ? 0 : names.some((n) => /location|country|city/i.test(n)) ? 1 : 2);
  return Object.entries(source.input.discover_options ?? {})
    .map(([name, names], i) => ({ name, names, i }))
    .sort((x, y) => rank(x.names) - rank(y.names) || x.i - y.i)
    .map(({ name, names }) => ({
      name,
      fields: names.map((n) => source.input.fields.find((f) => f.name === n) ?? { name: n, label: optionLabel(n), required: true, example: null }).map((f) => ({ ...f, required: true })),
    }));
}

/** The fields to ask for: the chosen search option's, else (a link) the link field, else all. */
export function inputFieldsFor(source: Pick<DataSource, "input">, option?: string | null): DataSourceField[] {
  const chosen = option ? searchOptions(source).find((o) => o.name === option) : null;
  if (chosen) return chosen.fields;
  if (source.input.kind === "keyword") return source.input.fields;
  const link = source.input.fields.find((f) => f.name === "url") ?? source.input.fields.find((f) => f.type === "url") ?? source.input.fields[0];
  return link ? [link] : [{ name: "url", label: "Link", required: true }];
}

/** What the fetch body carries for these field values; null + the missing labels when incomplete. */
export function buildInput(
  source: DataSource,
  values: Record<string, string>,
  option?: string | null,
): { input: DataFetchInput | null; missing: string[] } {
  const fields = inputFieldsFor(source, option);
  const missing = fields.filter((f) => f.required && !values[f.name]?.trim()).map((f) => f.label);
  if (missing.length) return { input: null, missing };
  const searching = Boolean(option) && searchOptions(source).some((o) => o.name === option);
  if (source.input.kind === "url" && !searching) {
    const field = fields[0];
    const url = (field ? values[field.name] : "")?.trim() ?? "";
    return url ? { input: { url }, missing: [] } : { input: null, missing: [field?.label ?? "Link"] };
  }
  const one: Record<string, string> = {};
  for (const f of fields) {
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
 * A source with the server's `url_pattern` (host and path regexes) matches by it alone, the same rule
 * as the extension (`matrx-extend` `src/lib/data-sources/contract.ts`); the example address is the fallback.
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
    if (s.input.kind !== "url") return false;
    if (s.url_pattern) return patternMatches(s.url_pattern, url);
    if (!s.example_url) return false;
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

/** The input in a few words for the source bar ("trustpilot.com/review/acme.com", "plumbers · Austin"). */
export function inputWords(input: DataFetchInput): string {
  if ("url" in input) {
    try {
      const u = new URL(input.url);
      return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}`;
    } catch {
      return input.url;
    }
  }
  return input.inputs.map((one) => Object.values(one).join(" · ")).join(", ");
}
