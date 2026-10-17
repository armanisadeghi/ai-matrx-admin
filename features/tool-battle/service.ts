"use client";

/**
 * Tool Battle data layer.
 *
 * READS go DIRECTLY to Supabase (RLS: platform admins read). COMPUTE (create/run, cancel, promote) goes to
 * aidream `/tool-battles` through `callApi`. 🚨 Cells are server-owned: this module never writes a
 * `tool.battle_cell` row. The catalog tables are L2's; their generated types land with them, so those reads
 * name their columns here and fail loudly on a missing table instead of guessing.
 */

import type { AppDispatch } from "@/lib/redux/store";
import { callApi, type ApiCallError } from "@/lib/api/call-api";
import type { paths } from "@ai-matrx/api/types";
import { createClient } from "@/utils/supabase/client";
import { isJsonObject } from "@/types/json";
import type {
  AnswerField,
  BattleJob,
  BattleRow,
  BattleSource,
  BattleStatus,
  BattleSummary,
  BattleView,
  CellRow,
  CellStatus,
  CellView,
  Evidence,
  Lane,
  Promotion,
  Subject,
  Via,
} from "./types";

const db = () => createClient().schema("tool");

/** 🚨 Local path literals until `pnpm sync-types` picks the routes up from a deployed server. */
const BATTLES_PATH = "/tool-battles" as keyof paths;
const RUN_PATH = "/tool-battles/{battle_id}/run" as keyof paths;
const CANCEL_PATH = "/tool-battles/{battle_id}/cancel" as keyof paths;
const PROMOTE_PATH = "/tool-battles/{battle_id}/promote" as keyof paths;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const numOrNull = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const via = (v: unknown): Via | null => (v === "direct" || v === "treg" ? v : null);

function parseLane(raw: unknown): Lane | null {
  if (!isJsonObject(raw)) return null;
  return {
    lane_id: str(raw.lane_id),
    endpoint_id: str(raw.endpoint_id),
    label: str(raw.label),
    provider_slug: strOrNull(raw.provider_slug),
    via: via(raw.via),
  };
}

function parseSubject(raw: unknown): Subject | null {
  if (!isJsonObject(raw)) return null;
  return {
    subject_id: str(raw.subject_id),
    label: str(raw.label),
    inputs: isJsonObject(raw.inputs) ? (raw.inputs as Record<string, unknown>) : {},
    pool_id: strOrNull(raw.pool_id),
  };
}

export function toBattleView(row: BattleRow): BattleView {
  const meta = isJsonObject(row.metadata) ? row.metadata : {};
  return {
    id: row.id,
    title: row.title,
    jobKey: row.job_key,
    toolId: row.tool_id,
    status: row.status as BattleStatus,
    blind: row.blind,
    blindOrder: list(meta.blind_order).map(String),
    leaseSeconds: numOrNull(meta.lease_seconds),
    lanes: list(row.lanes).map(parseLane).filter((l): l is Lane => l !== null),
    subjects: list(row.subjects).map(parseSubject).filter((s): s is Subject => s !== null),
    summary: isJsonObject(row.summary) ? (row.summary as unknown as BattleSummary) : null,
    promotions: list(row.promotions).filter(isJsonObject) as unknown as Promotion[],
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

function parseEvidence(raw: unknown): Evidence | null {
  if (!isJsonObject(raw)) return null;
  return {
    verified: raw.verified === true,
    clean: raw.clean === true,
    problems: list(raw.problems).map(String),
    attempts: numOrNull(raw.attempts) ?? 0,
  };
}

export function toCellView(row: CellRow): CellView {
  return {
    id: row.id,
    laneId: row.lane_id,
    subjectId: row.subject_id,
    status: row.status as CellStatus,
    heartbeatAt: row.heartbeat_at,
    callId: row.call_id,
    providerSlug: row.provider_slug,
    via: via(row.via),
    wallMs: row.wall_ms,
    vendorMs: row.vendor_ms,
    costUsd: numOrNull(row.cost_usd),
    points: numOrNull(row.points),
    errorCode: row.error_code,
    errorMessage: row.error_message,
    output: row.output,
    answerFields: list(row.answer_fields).filter(isJsonObject) as unknown as AnswerField[],
    rawFields: list(row.raw_fields).map(String),
    ignoredFilters: list(row.ignored_filters).filter(isJsonObject) as unknown as { input: string; label: string }[],
    evidence: parseEvidence(row.evidence),
  };
}

export async function listBattles(): Promise<BattleView[]> {
  const { data, error } = await db()
    .from("battle")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not read the battles: ${error.message}`);
  return (data ?? []).map(toBattleView);
}

export async function fetchBattle(id: string): Promise<BattleView | null> {
  const { data, error } = await db().from("battle").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(`Could not read the battle: ${error.message}`);
  return data ? toBattleView(data) : null;
}

export async function fetchCells(battleId: string): Promise<CellView[]> {
  const { data, error } = await db()
    .from("battle_cell")
    .select("*")
    .eq("battle_id", battleId)
    .is("deleted_at", null)
    .limit(2000);
  if (error) throw new Error(`Could not read the results: ${error.message}`);
  return (data ?? []).map(toCellView);
}

export async function archiveBattle(id: string): Promise<void> {
  const { error } = await db().from("battle").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(`Could not archive the battle: ${error.message}`);
}

// ── catalog reads (L2's tables; admin read) ───────────────────────────────────

type Loose = Record<string, unknown>;

async function catalogRows(table: string, build: (q: never) => unknown, columns = "*"): Promise<Loose[]> {
  const base = db().from(table as never) as unknown as { select(cols: string): unknown };
  const query = build(base.select(columns) as never) as PromiseLike<{ data: Loose[] | null; error: { message: string } | null }>;
  const { data, error } = await query;
  if (error) throw new Error(`Could not read the catalog (${table}): ${error.message}`);
  return data ?? [];
}

/** Every row of a catalog table, a page at a time (PostgREST caps one read at 1000 rows). */
async function allCatalogRows(table: string, columns: string): Promise<Loose[]> {
  const PAGE = 1000;
  const out: Loose[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = await catalogRows(
      table,
      (q) => (q as never as { range(a: number, b: number): unknown }).range(from, from + PAGE - 1),
      columns,
    );
    out.push(...page);
    if (page.length < PAGE) return out;
  }
}

/**
 * Catalog Tools a battle can compare: those with at least two sources. Their input declaration is read when one
 * is chosen (`fetchJobParameters`), never for the whole catalog. Empty until the catalog has rows.
 */
export async function listBattleJobs(): Promise<BattleJob[]> {
  const endpoints = await allCatalogRows("catalog_endpoint", "tool_id,state");
  const sources = new Map<string, number>();
  for (const e of endpoints) {
    if (str(e.state) === "retired") continue;
    sources.set(str(e.tool_id), (sources.get(str(e.tool_id)) ?? 0) + 1);
  }
  const entries = await allCatalogRows("catalog_entry", "tool_id,job_key,display_name,job_family");
  return entries
    .filter((e) => (sources.get(str(e.tool_id)) ?? 0) >= 2)
    .map((e) => ({
      toolId: str(e.tool_id),
      jobKey: str(e.job_key),
      displayName: str(e.display_name) || str(e.job_key),
      jobFamily: str(e.job_family),
      parameters: {},
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/** One job's declared inputs (JSON Schema `parameters`). */
export async function fetchJobParameters(toolId: string): Promise<Record<string, unknown>> {
  const rows = await catalogRows("definition", (q) => (q as never as { eq(c: string, v: string): { limit(n: number): unknown } }).eq("id", toolId).limit(1), "id,parameters");
  const p = rows[0]?.parameters;
  return isJsonObject(p) ? (p as Record<string, unknown>) : {};
}

/** The endpoints of one job with their provider's admin name. */
export async function listBattleSources(toolId: string): Promise<BattleSource[]> {
  const endpoints = await catalogRows("catalog_endpoint", (q) =>
    (q as never as { eq(c: string, v: string): { limit(n: number): unknown } }).eq("tool_id", toolId).limit(200),
  );
  if (endpoints.length === 0) return [];
  const providers = await catalogRows("catalog_provider", (q) => (q as never as { limit(n: number): unknown }).limit(500));
  const names = new Map(providers.map((p) => [str(p.slug), str(p.admin_name) || str(p.slug)]));
  return endpoints
    .filter((e) => str(e.state) !== "retired")
    .map((e) => ({
      endpointId: str(e.id),
      providerSlug: str(e.provider_slug),
      providerName: names.get(str(e.provider_slug)) ?? str(e.provider_slug),
      via: (via(e.via) ?? "direct") as Via,
      state: str(e.state),
      priority: numOrNull(e.priority),
      supportedInputs: list(e.supported_inputs).map(String),
      trapNotes: strOrNull(e.trap_notes),
    }))
    .sort((a, b) => (a.via === b.via ? a.providerName.localeCompare(b.providerName) : a.via === "direct" ? -1 : 1));
}

// ── compute ────────────────────────────────────────────────────────────────────

export interface NewBattleBody {
  title: string;
  job_key: string;
  tool_id: string | null;
  lanes: { endpoint_id: string; label: string; provider_slug: string | null; via: Via | null }[];
  subjects: { label: string; inputs: Record<string, unknown>; pool_id?: string | null }[];
  blind: boolean;
  run: boolean;
}

export interface ComputeOutcome<T> {
  data: T | null;
  error: string | null;
}

function describe(err: ApiCallError, fallback: string): string {
  const parts: string[] = [];
  if (typeof err.status === "number" && err.status > 0) parts.push(`HTTP ${err.status}`);
  parts.push(err.message || fallback);
  return parts.join(" · ");
}

async function post<T>(
  dispatch: AppDispatch,
  path: keyof paths,
  pathParams: Record<string, string> | undefined,
  body: unknown,
  fallback: string,
): Promise<ComputeOutcome<T>> {
  const result = await dispatch(
    callApi({ path, method: "POST", pathParams: pathParams as never, body: body as never } as never),
  );
  if (result.error) return { data: null, error: describe(result.error, fallback) };
  return { data: (result.data ?? null) as T | null, error: null };
}

export const createBattle = (dispatch: AppDispatch, body: NewBattleBody) =>
  post<{ battle_id: string; status: string; queued?: number }>(dispatch, BATTLES_PATH, undefined, body, "Could not start the battle.");

export const runBattle = (
  dispatch: AppDispatch,
  battleId: string,
  body: { scope: "unfinished" | "all"; cells?: { lane_id: string; subject_id: string }[] | null },
) => post<{ queued: number; status: string }>(dispatch, RUN_PATH, { battle_id: battleId }, body, "Could not run the battle.");

export const cancelBattle = (dispatch: AppDispatch, battleId: string) =>
  post<{ status: string }>(dispatch, CANCEL_PATH, { battle_id: battleId }, {}, "Could not cancel the battle.");

export const promoteOrder = (dispatch: AppDispatch, battleId: string, order: string[]) =>
  post<Promotion>(dispatch, PROMOTE_PATH, { battle_id: battleId }, { order }, "Could not promote the order.");
