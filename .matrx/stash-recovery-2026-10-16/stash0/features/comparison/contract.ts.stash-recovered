/**
 * Compare — the board's door to the server's deterministic comparison engine (aidream
 * `services/comparison`). Pure: the wire types, the parsers, and the stream reader. Network calls
 * live in `./server.ts`; the page is `./ComparePage.tsx`.
 *
 * Contract (server lane, 2026-10-15):
 *   GET  /comparison                     → { kinds }
 *   POST /comparison/quote               { kind, items:[{label?,url?,inputs?}], records_per_item? } → ComparisonQuote
 *   POST /comparison/run      (NDJSON)   same body → `comparison_stage` events … then ONE `comparison_result`
 * A refusal is an `error` event `{ code, user_message, limit? }`.
 */

export type FieldType = "rating" | "number" | "int" | "percent" | "text" | "hours" | "url" | "date";
export type Direction = "higher_better" | "lower_better" | "none";
export type KindStatus = "live" | "coming";

export interface CompareField {
  key: string;
  label: string;
  type: FieldType;
  direction: Direction;
  is_primary: boolean;
  help: string;
}

export interface ComparisonKindInfo {
  key: string;
  label: string;
  description: string;
  status: KindStatus;
  source_key: string;
  records_are: "entity" | "items";
  input_label: string;
  input_hint: string;
  example: string | null;
  records_per_item: number;
  fields: CompareField[];
  primary_field: string;
  discovery_note: string;
}

export interface ComparisonQuote {
  kind: string;
  kind_label: string;
  item_count: number;
  records_per_item: number;
  total_records: number;
  points_per_record: number;
  total_points: number;
  usd_per_record: number | null;
  total_usd: number | null;
  note: string;
}

export interface ComparedValue {
  value: unknown;
  display: string;
  is_best: boolean;
  basis: string;
}

export interface ComparedItem {
  item_id: string;
  name: string;
  rank: number;
  source_key: string;
  job_id: string | null;
  table_id: string | null;
  table_name: string | null;
  records_billed: number;
  cost_usd: number;
  points: number;
  raw_record_count: number;
  values: Record<string, ComparedValue>;
  notices: string[];
  error: string | null;
}

export interface ComparisonResult {
  kind: string;
  kind_label: string;
  status: KindStatus;
  fields: CompareField[];
  primary_field: string;
  items: ComparedItem[];
  total_records_billed: number;
  total_cost_usd: number;
  total_points: number;
  generated_at: string | null;
  notices: string[];
}

export interface ComparisonItemInput {
  label?: string | null;
  url?: string | null;
  inputs?: Record<string, unknown> | null;
}

export interface ComparisonProgress {
  itemIndex: number;
  itemCount: number;
  itemLabel: string;
  label: string;
  current: number | null;
  total: number | null;
}

export class ComparisonRefusal extends Error {
  code: string;
  userMessage: string;
  limit: { setting?: string; value?: number } | null;
  constructor(code: string, userMessage: string, limit: { setting?: string; value?: number } | null = null) {
    super(userMessage);
    this.name = "ComparisonRefusal";
    this.code = code;
    this.userMessage = userMessage;
    this.limit = limit;
  }
}

// ── parsers (defensive: the wire is untrusted) ──────────────────────────────

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean => v === true;
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function parseField(v: unknown): CompareField {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    key: str(o.key),
    label: str(o.label),
    type: (str(o.type) || "text") as FieldType,
    direction: (str(o.direction) || "none") as Direction,
    is_primary: bool(o.is_primary),
    help: str(o.help),
  };
}

export function parseKind(v: unknown): ComparisonKindInfo {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    key: str(o.key),
    label: str(o.label),
    description: str(o.description),
    status: str(o.status) === "coming" ? "coming" : "live",
    source_key: str(o.source_key),
    records_are: str(o.records_are) === "items" ? "items" : "entity",
    input_label: str(o.input_label) || "Page address",
    input_hint: str(o.input_hint),
    example: strOrNull(o.example),
    records_per_item: num(o.records_per_item) || 1,
    fields: Array.isArray(o.fields) ? o.fields.map(parseField) : [],
    primary_field: str(o.primary_field),
    discovery_note: str(o.discovery_note),
  };
}

export function parseKinds(raw: unknown): ComparisonKindInfo[] {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return Array.isArray(o.kinds) ? o.kinds.map(parseKind) : [];
}

export function parseQuote(raw: unknown): ComparisonQuote {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    kind: str(o.kind),
    kind_label: str(o.kind_label),
    item_count: num(o.item_count),
    records_per_item: num(o.records_per_item),
    total_records: num(o.total_records),
    points_per_record: num(o.points_per_record),
    total_points: num(o.total_points),
    usd_per_record: numOrNull(o.usd_per_record),
    total_usd: numOrNull(o.total_usd),
    note: str(o.note),
  };
}

function parseValue(v: unknown): ComparedValue {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { value: o.value ?? null, display: str(o.display) || "—", is_best: bool(o.is_best), basis: str(o.basis) };
}

function parseItem(v: unknown): ComparedItem {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const rawValues = (o.values && typeof o.values === "object" ? o.values : {}) as Record<string, unknown>;
  const values: Record<string, ComparedValue> = {};
  for (const [k, val] of Object.entries(rawValues)) values[k] = parseValue(val);
  return {
    item_id: str(o.item_id),
    name: str(o.name) || "Unnamed",
    rank: num(o.rank),
    source_key: str(o.source_key),
    job_id: strOrNull(o.job_id),
    table_id: strOrNull(o.table_id),
    table_name: strOrNull(o.table_name),
    records_billed: num(o.records_billed),
    cost_usd: num(o.cost_usd),
    points: num(o.points),
    raw_record_count: num(o.raw_record_count),
    values,
    notices: strList(o.notices),
    error: strOrNull(o.error),
  };
}

export function parseResult(raw: unknown): ComparisonResult | null {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  if (!o.kind) return null;
  return {
    kind: str(o.kind),
    kind_label: str(o.kind_label),
    status: str(o.status) === "coming" ? "coming" : "live",
    fields: Array.isArray(o.fields) ? o.fields.map(parseField) : [],
    primary_field: str(o.primary_field),
    items: Array.isArray(o.items) ? o.items.map(parseItem) : [],
    total_records_billed: num(o.total_records_billed),
    total_cost_usd: num(o.total_cost_usd),
    total_points: num(o.total_points),
    generated_at: strOrNull(o.generated_at),
    notices: strList(o.notices),
  };
}

function refusalOf(d: Record<string, unknown>): ComparisonRefusal {
  const details = d.details && typeof d.details === "object" ? (d.details as Record<string, unknown>) : {};
  const limitRaw = (d.limit ?? details.limit) as Record<string, unknown> | undefined;
  const limit = limitRaw && typeof limitRaw === "object"
    ? { setting: strOrNull(limitRaw.setting) ?? undefined, value: numOrNull(limitRaw.value) ?? undefined }
    : null;
  return new ComparisonRefusal(
    strOrNull(d.code) ?? strOrNull(details.code) ?? strOrNull(d.error_type) ?? "comparison_failed",
    strOrNull(d.user_message) ?? strOrNull(details.user_message) ?? strOrNull(d.message) ?? "The comparison could not be run.",
    limit,
  );
}

type Read =
  | { kind: "progress"; progress: ComparisonProgress }
  | { kind: "result"; result: ComparisonResult }
  | { kind: "refusal"; refusal: ComparisonRefusal }
  | null;

export function readEvent(evt: unknown): Read {
  if (!evt || typeof evt !== "object") return null;
  const e = evt as { event?: string; data?: Record<string, unknown> };
  const d = e.data ?? {};
  if (e.event === "error") return { kind: "refusal", refusal: refusalOf(d) };
  if (e.event !== "data") return null;
  if (d.type === "comparison_stage") {
    return {
      kind: "progress",
      progress: {
        itemIndex: num(d.item_index),
        itemCount: num(d.item_count),
        itemLabel: str(d.item_label),
        label: strOrNull(d.label) ?? strOrNull(d.stage) ?? "Working",
        current: numOrNull(d.current),
        total: numOrNull(d.total),
      },
    };
  }
  if (d.type === "comparison_result") {
    const result = parseResult(d.result);
    return result ? { kind: "result", result } : null;
  }
  return null;
}

export async function consumeComparison(
  events: AsyncIterable<unknown>,
  onProgress?: (p: ComparisonProgress) => void,
): Promise<ComparisonResult> {
  let result: ComparisonResult | null = null;
  let refusal: ComparisonRefusal | null = null;
  for await (const evt of events) {
    const read = readEvent(evt);
    if (!read) continue;
    if (read.kind === "progress") onProgress?.(read.progress);
    else if (read.kind === "result") {
      result = read.result;
      break;
    } else refusal = read.refusal;
  }
  if (refusal) throw refusal;
  if (!result) throw new ComparisonRefusal("comparison_no_result", "The comparison ended without a result.");
  return result;
}
