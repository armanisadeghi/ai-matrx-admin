/**
 * Compare — the door to the server's deterministic comparison engine (aidream
 * `services/comparison`, contract in its FEATURE.md). Pure: the wire types, the parsers, and the
 * stream reader. Network calls live in `./server.ts`; drop-safe settling in `./settle.ts`.
 *
 *   GET  /comparison                     → { kinds }
 *   POST /comparison/lookup              { kind, items } → LookupResult ("here's what we found")
 *   POST /comparison/quote               { kind, items, candidates? } → ComparisonQuote
 *   POST /comparison/run      (NDJSON)   same body → `comparison_run` {run_id} FIRST, then
 *                                        `comparison_stage` per item, then ONE `comparison_result`
 *   GET  /comparison/runs/{run_id}       → ComparisonRunState (progress + result; resumes a stopped run)
 * A refusal is an `error` event `{ code, user_message, limit? }` (or a 400 before the stream opens).
 */

export type FieldType = "rating" | "number" | "int" | "percent" | "money" | "text" | "hours" | "url" | "date" | "distribution" | "contact" | "status" | "tags" | "reviews";
export type Direction = "higher_better" | "lower_better" | "none";
export type KindStatus = "live" | "coming";

export interface CompareField {
  key: string;
  label: string;
  type: FieldType;
  direction: Direction;
  is_primary: boolean;
  help: string;
  /** The facet this field is read from ("" = the kind's own source); results group fields by it. */
  facet?: string;
  facet_label?: string;
}

/** An optional extra source a kind's items can gather: an on/off option with its cost, before any run. */
export interface FacetInfo {
  key: string;
  label: string;
  help: string;
  default_on: boolean;
  speed: "fast" | "slow";
  typical_seconds: number | null;
  /** Points this facet adds per item, at the organization's rate. */
  points_per_item: number;
  /** Labels of the fields it adds. */
  adds: string[];
}

export interface FacetQuote {
  key: string;
  label: string;
  on: boolean;
  points: number;
  usd: number | null;
  usd_display: string | null;
  speed: "fast" | "slow";
  typical_seconds: number | null;
  adds: string[];
}

/** What one facet gave one item. */
export interface ItemFacet {
  key: string;
  label: string;
  status: "done" | "failed" | "off";
  error: string | null;
  points: number;
  seconds: number | null;
  source_url: string | null;
  table_id: string | null;
  /** The data fetch that read this facet: its stage times and, for an admin, what ran under the hood. */
  job_id?: string | null;
  /** A page that only resembles the company: shown as "Is this them?", never read or scored until confirmed. */
  possible_url?: string | null;
  possible_name?: string | null;
  /** The person said "not them": it stays empty and is not offered again. */
  rejected?: boolean;
}

export interface HiddenField {
  key: string;
  label: string;
  reason: "missing" | "constant";
}

export interface LookupField {
  key: string;
  label: string;
  required: boolean;
  example: string | null;
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
  lookup_fields: LookupField[];
  pick_key: string;
  finds_by_name: boolean;
  /** Points one typed-name search costs at lookup (links are matched free). */
  lookup_points: number;
  records_per_item: number;
  fields: CompareField[];
  primary_field: string;
  discovery_note: string;
  /** Extra sources each item can gather (companies), each an on/off option. */
  facets?: FacetInfo[];
  /** Sites an item's link may come from ("Amazon", "Instagram"). */
  supported_sites?: string[];
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
  usd_per_record_display: string | null;
  total_usd_display: string | null;
  records_by_item: number[];
  note: string;
  /** Every facet with its cost for the whole list; the total counts the ones that are on. */
  facets?: FacetQuote[];
}

export interface ComparedValue {
  value: unknown;
  display: string;
  is_best: boolean;
  basis: string;
}

export interface PlaceCandidate {
  pick: string;
  name: string;
  address: string;
  category: string;
  rating: number | null;
  reviews_count: number | null;
  url: string | null;
}

export interface ComparedItem {
  item_id: string;
  /** Where the item sat in the request (the result is ranked): the number an "Is this them?" answer names. */
  item_index?: number;
  name: string;
  rank: number;
  source_key: string;
  job_id: string | null;
  table_id: string | null;
  table_name: string | null;
  records_billed: number;
  cost_usd: number;
  cost_display: string;
  points: number;
  raw_record_count: number;
  logo_url: string | null;
  website: string | null;
  source_url: string | null;
  values: Record<string, ComparedValue>;
  notices: string[];
  error: string | null;
  /** Only the kind's own source failed (no reviews page) while a facet stands: compared on its facets. */
  source_error?: string | null;
  needs_choice: boolean;
  candidates: PlaceCandidate[];
  /** Plain words when the rating rests on few reviews ("Only 6 reviews"); null when the sample is fine. */
  thin_sample?: string | null;
  /** The site the facts came from ("Amazon", "Instagram"); mixed platforms are labeled. */
  source_label?: string | null;
  facets?: ItemFacet[];
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
  total_cost_display: string;
  total_points: number;
  generated_at: string | null;
  notices: string[];
  /** The facets that were on for this run. */
  facets?: FacetInfo[];
  /** Fields not shown: no item had them, or every item had the same value. */
  hidden_fields?: HiddenField[];
}

export interface ComparisonItemInput {
  label?: string | null;
  url?: string | null;
  inputs?: Record<string, unknown> | null;
  website?: string | null;
  logo_url?: string | null;
}

export type ItemStage = "queued" | "fetching" | "reading" | "storing" | "done";

/** One item's progress — from a stream stage event or the run row. */
export interface ItemProgress {
  index: number;
  label: string;
  /** What the person confirmed for the item (kept on the run so a rejoining page shows it). */
  logoUrl?: string | null;
  website?: string | null;
  stage: ItemStage;
  stageLabel: string;
  current: number | null;
  total: number | null;
  done: boolean;
  error: string | null;
  /** Why it failed — `empty` is a lookup miss ("Not found"); anything else is a read failure. */
  errorCode?: string | null;
}

export interface ComparisonProgress {
  runId: string | null;
  itemIndex: number;
  itemCount: number;
  itemLabel: string;
  stage: ItemStage;
  label: string;
  current: number | null;
  total: number | null;
}

export type RunStatus = "running" | "done" | "failed";

export interface ComparisonRunState {
  run_id: string;
  kind: string;
  kind_label: string;
  status: RunStatus;
  item_count: number;
  items: ItemProgress[];
  result: ComparisonResult | null;
  error_code: string | null;
  user_message: string | null;
  created_at: string | null;
  finished_at: string | null;
  resuming: boolean;
  /** True only for the run's owner, the one person who may answer "Is this them?". */
  can_confirm?: boolean;
}

export type LookupStatus = "found" | "choose" | "not_found";

export interface LookupMatch {
  item: ComparisonItemInput;
  name: string;
  detail: string;
  logo_url: string | null;
  website: string | null;
  url: string | null;
  rating: number | null;
  reviews_count: number | null;
}

export interface LookupItem {
  index: number;
  query: string;
  status: LookupStatus;
  match: LookupMatch | null;
  candidates: LookupMatch[];
  message: string | null;
}

export interface LookupResult {
  kind: string;
  items: LookupItem[];
  searches: number;
  points: number;
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

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean => v === true;
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
function list<T>(v: unknown, f: (x: unknown) => T): T[] {
  return Array.isArray(v) ? v.map((x) => f(x)) : [];
}

const STAGES: readonly ItemStage[] = ["queued", "fetching", "reading", "storing", "done"];
/** `waiting_for_provider` is the key older servers (and runs saved before 2026-10-16) still send. */
export const stageOf = (v: unknown): ItemStage => {
  const key = v === "waiting_for_provider" ? "reading" : v;
  return STAGES.includes(key as ItemStage) ? (key as ItemStage) : "queued";
};

function parseField(v: unknown): CompareField {
  const o = obj(v);
  return {
    key: str(o.key),
    label: str(o.label),
    type: (str(o.type) || "text") as FieldType,
    direction: (str(o.direction) || "none") as Direction,
    is_primary: bool(o.is_primary),
    help: str(o.help),
    facet: str(o.facet),
    facet_label: str(o.facet_label),
  };
}

const speedOf = (v: unknown): "fast" | "slow" => (v === "slow" ? "slow" : "fast");

function parseFacetInfo(v: unknown): FacetInfo {
  const o = obj(v);
  return {
    key: str(o.key), label: str(o.label), help: str(o.help), default_on: bool(o.default_on),
    speed: speedOf(o.speed), typical_seconds: numOrNull(o.typical_seconds),
    points_per_item: num(o.points_per_item), adds: strList(o.adds),
  };
}

function parseFacetQuote(v: unknown): FacetQuote {
  const o = obj(v);
  return {
    key: str(o.key), label: str(o.label), on: bool(o.on), points: num(o.points), usd: numOrNull(o.usd),
    usd_display: strOrNull(o.usd_display), speed: speedOf(o.speed), typical_seconds: numOrNull(o.typical_seconds),
    adds: strList(o.adds),
  };
}

function parseItemFacet(v: unknown): ItemFacet {
  const o = obj(v);
  const status = str(o.status);
  return {
    key: str(o.key), label: str(o.label),
    status: status === "failed" || status === "off" ? status : "done",
    error: strOrNull(o.error), points: num(o.points), seconds: numOrNull(o.seconds),
    source_url: strOrNull(o.source_url), table_id: strOrNull(o.table_id),
    possible_url: strOrNull(o.possible_url), possible_name: strOrNull(o.possible_name), rejected: bool(o.rejected),
  };
}

function parseHidden(v: unknown): HiddenField {
  const o = obj(v);
  return { key: str(o.key), label: str(o.label), reason: str(o.reason) === "constant" ? "constant" : "missing" };
}

function parseLookupField(v: unknown): LookupField {
  const o = obj(v);
  return { key: str(o.key), label: str(o.label), required: o.required !== false, example: strOrNull(o.example) };
}

export function parseKind(v: unknown): ComparisonKindInfo {
  const o = obj(v);
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
    lookup_fields: list(o.lookup_fields, parseLookupField),
    pick_key: str(o.pick_key),
    finds_by_name: bool(o.finds_by_name),
    lookup_points: num(o.lookup_points),
    records_per_item: num(o.records_per_item) || 1,
    fields: list(o.fields, parseField),
    primary_field: str(o.primary_field),
    discovery_note: str(o.discovery_note),
    facets: list(o.facets, parseFacetInfo),
    supported_sites: strList(o.supported_sites),
  };
}

export function parseKinds(raw: unknown): ComparisonKindInfo[] {
  return list(obj(raw).kinds, parseKind);
}

export function parseQuote(raw: unknown): ComparisonQuote {
  const o = obj(raw);
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
    usd_per_record_display: strOrNull(o.usd_per_record_display),
    total_usd_display: strOrNull(o.total_usd_display),
    records_by_item: Array.isArray(o.records_by_item) ? o.records_by_item.map(num) : [],
    note: str(o.note),
    facets: list(o.facets, parseFacetQuote),
  };
}

function parseValue(v: unknown): ComparedValue {
  const o = obj(v);
  return { value: o.value ?? null, display: str(o.display) || "—", is_best: bool(o.is_best), basis: str(o.basis) };
}

function parseCandidate(v: unknown): PlaceCandidate {
  const o = obj(v);
  return {
    pick: str(o.pick),
    name: str(o.name),
    address: str(o.address),
    category: str(o.category),
    rating: numOrNull(o.rating),
    reviews_count: numOrNull(o.reviews_count),
    url: strOrNull(o.url),
  };
}

function parseItem(v: unknown): ComparedItem {
  const o = obj(v);
  const values: Record<string, ComparedValue> = {};
  for (const [k, val] of Object.entries(obj(o.values))) values[k] = parseValue(val);
  return {
    item_id: str(o.item_id),
    // absent on results saved before items carried their position: left absent, never guessed as 0
    item_index: typeof o.item_index === "number" && Number.isFinite(o.item_index) ? o.item_index : undefined,
    name: str(o.name) || "Unnamed",
    rank: num(o.rank),
    source_key: str(o.source_key),
    job_id: strOrNull(o.job_id),
    table_id: strOrNull(o.table_id),
    table_name: strOrNull(o.table_name),
    records_billed: num(o.records_billed),
    cost_usd: num(o.cost_usd),
    cost_display: str(o.cost_display),
    points: num(o.points),
    raw_record_count: num(o.raw_record_count),
    logo_url: strOrNull(o.logo_url),
    website: strOrNull(o.website),
    source_url: strOrNull(o.source_url),
    values,
    notices: strList(o.notices),
    error: strOrNull(o.error),
    source_error: strOrNull(o.source_error),
    needs_choice: bool(o.needs_choice),
    candidates: list(o.candidates, parseCandidate),
    thin_sample: strOrNull(o.thin_sample),
    source_label: strOrNull(o.source_label),
    facets: list(o.facets, parseItemFacet),
  };
}

export function parseResult(raw: unknown): ComparisonResult | null {
  const o = obj(raw);
  if (!o.kind) return null;
  return {
    kind: str(o.kind),
    kind_label: str(o.kind_label),
    status: str(o.status) === "coming" ? "coming" : "live",
    fields: list(o.fields, parseField),
    primary_field: str(o.primary_field),
    items: list(o.items, parseItem),
    total_records_billed: num(o.total_records_billed),
    total_cost_usd: num(o.total_cost_usd),
    total_cost_display: str(o.total_cost_display),
    total_points: num(o.total_points),
    generated_at: strOrNull(o.generated_at),
    notices: strList(o.notices),
    facets: list(o.facets, parseFacetInfo),
    hidden_fields: list(o.hidden_fields, parseHidden),
  };
}

function parseItemInput(v: unknown): ComparisonItemInput {
  const o = obj(v);
  const inputs = o.inputs && typeof o.inputs === "object" ? (o.inputs as Record<string, unknown>) : null;
  return {
    label: strOrNull(o.label),
    url: strOrNull(o.url),
    inputs,
    website: strOrNull(o.website),
    logo_url: strOrNull(o.logo_url),
  };
}

function parseMatch(v: unknown): LookupMatch {
  const o = obj(v);
  return {
    item: parseItemInput(o.item),
    name: str(o.name),
    detail: str(o.detail),
    logo_url: strOrNull(o.logo_url),
    website: strOrNull(o.website),
    url: strOrNull(o.url),
    rating: numOrNull(o.rating),
    reviews_count: numOrNull(o.reviews_count),
  };
}

function parseLookupItem(v: unknown): LookupItem {
  const i = obj(v);
  const status = str(i.status);
  return {
    index: num(i.index),
    query: str(i.query),
    status: status === "found" || status === "choose" ? status : "not_found",
    match: i.match ? parseMatch(i.match) : null,
    candidates: list(i.candidates, parseMatch),
    message: strOrNull(i.message),
  };
}

export function parseLookup(raw: unknown): LookupResult {
  const o = obj(raw);
  return { kind: str(o.kind), items: list(o.items, parseLookupItem), searches: num(o.searches), points: num(o.points) };
}

function parseItemProgress(v: unknown): ItemProgress {
  const o = obj(v);
  return {
    index: num(o.index),
    label: str(o.label),
    logoUrl: strOrNull(o.logo_url),
    website: strOrNull(o.website),
    stage: stageOf(o.stage),
    stageLabel: str(o.stage_label),
    current: numOrNull(o.current),
    total: numOrNull(o.total),
    done: bool(o.done),
    error: strOrNull(o.error),
    errorCode: strOrNull(o.error_code),
  };
}

export function parseRunState(raw: unknown): ComparisonRunState | null {
  const o = obj(raw);
  if (!o.run_id) return null;
  const status = str(o.status);
  return {
    run_id: str(o.run_id),
    kind: str(o.kind),
    kind_label: str(o.kind_label),
    status: status === "done" || status === "failed" ? status : "running",
    item_count: num(o.item_count),
    items: list(o.items, parseItemProgress),
    result: o.result ? parseResult(o.result) : null,
    error_code: strOrNull(o.error_code),
    user_message: strOrNull(o.user_message),
    created_at: strOrNull(o.created_at),
    finished_at: strOrNull(o.finished_at),
    resuming: bool(o.resuming),
    can_confirm: bool(o.can_confirm),
  };
}

function refusalOf(d: Obj): ComparisonRefusal {
  const details = obj(d.details);
  const limitRaw = (d.limit ?? details.limit) as Obj | undefined;
  const limit = limitRaw && typeof limitRaw === "object"
    ? { setting: strOrNull(limitRaw.setting) ?? undefined, value: numOrNull(limitRaw.value) ?? undefined }
    : null;
  return new ComparisonRefusal(
    strOrNull(d.code) ?? strOrNull(details.code) ?? strOrNull(d.error_type) ?? "comparison_failed",
    strOrNull(d.user_message) ?? strOrNull(details.user_message) ?? strOrNull(d.message) ?? "The comparison could not be run.",
    limit,
  );
}

export type Read =
  | { kind: "run"; runId: string; labels: string[] }
  | { kind: "progress"; progress: ComparisonProgress }
  | { kind: "result"; result: ComparisonResult }
  | { kind: "refusal"; refusal: ComparisonRefusal }
  | null;

export function readEvent(evt: unknown): Read {
  if (!evt || typeof evt !== "object") return null;
  const e = evt as { event?: string; data?: Obj };
  const d = e.data ?? {};
  if (e.event === "error") return { kind: "refusal", refusal: refusalOf(d) };
  if (e.event !== "data") return null;
  if (d.type === "comparison_run") {
    const runId = strOrNull(d.run_id);
    return runId ? { kind: "run", runId, labels: strList(d.labels) } : null;
  }
  if (d.type === "comparison_stage") {
    return {
      kind: "progress",
      progress: {
        runId: strOrNull(d.run_id),
        itemIndex: num(d.item_index),
        itemCount: num(d.item_count),
        itemLabel: str(d.item_label),
        stage: stageOf(d.stage),
        label: strOrNull(d.label) ?? "Working",
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

const STAGE_ORDER: Record<ItemStage, number> = { queued: 0, fetching: 1, reading: 2, storing: 3, done: 4 };

/** Fold a read of the run row into what is shown: an item never moves backwards (the row is
 * written on stage changes, a live stream can be a moment ahead of it). */
export function mergeRunProgress(shown: ItemProgress[], fromRun: ItemProgress[]): ItemProgress[] {
  return fromRun.map((r, i) => {
    const s = shown[i];
    if (!s || r.done || r.error) return { ...s, ...r, logoUrl: r.logoUrl ?? s?.logoUrl, website: r.website ?? s?.website };
    return STAGE_ORDER[s.stage] > STAGE_ORDER[r.stage] ? { ...r, ...s, done: s.done || r.done } : { ...s, ...r };
  });
}

/** Fold one stage event into the per-item progress list (index-addressed, never reorders). */
export function applyProgress(items: ItemProgress[], p: ComparisonProgress): ItemProgress[] {
  const next = items.slice();
  const prev: ItemProgress = next[p.itemIndex] ?? {
    index: p.itemIndex, label: p.itemLabel, stage: "queued", stageLabel: "", current: null, total: null,
    done: false, error: null,
  };
  next[p.itemIndex] = {
    ...prev,
    label: prev.label || p.itemLabel,
    stage: p.stage,
    stageLabel: p.label,
    current: p.current,
    total: p.total,
    done: prev.done || p.stage === "done",
  };
  return next;
}
