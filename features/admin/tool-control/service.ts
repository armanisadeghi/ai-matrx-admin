import { readAllRows } from "@ai-matrx/data/db";
import { postJson } from "@/lib/python-client";
import { runWithSessionRetry } from "@/lib/supabase/authRetry";
import { createClient } from "@/utils/supabase/client";
import type { EndpointRow, EntryRow, ProviderRow, ScorecardRow, StripRow } from "./types";

/**
 * Reads go straight to the database under RLS (platform admins only); every change goes through ONE door,
 * `/admin/tool-control` on the server, because a verification run is a real, paid call and the manual on
 * must be refused by the same code that runs it.
 *
 * The generated database types predate these tables and views, so the query builder is typed by hand
 * here; regenerating types/database.types.ts removes the cast.
 */

interface LooseQuery extends PromiseLike<{ data: unknown[] | null; count?: number | null; error: { message: string } | null }> {
  order(column: string, opts?: { ascending: boolean }): LooseQuery;
  range(from: number, to: number): LooseQuery;
  eq(column: string, value: string | number): LooseQuery;
  in(column: string, values: readonly string[]): LooseQuery;
}
interface LooseSchema {
  from(table: string): { select(columns: string, opts?: { count: "exact" }): LooseQuery };
}

function tool(): LooseSchema {
  return createClient().schema("tool") as unknown as LooseSchema;
}

function readTable<T>(table: string, columns: string, order: string, narrow?: (q: LooseQuery) => LooseQuery): Promise<T[]> {
  return readAllRows<T>(
    ({ from, to }) =>
      runWithSessionRetry(() => {
        const q = tool().from(table).select(columns, { count: "exact" }).order(order, { ascending: true }).range(from, to);
        return (narrow ? narrow(q) : q) as unknown as Promise<{ data: unknown[] | null; count?: number | null; error: { message: string } | null }>;
      }).then((result) => ({
        data: result.data as T[] | null,
        count: "count" in result && typeof result.count === "number" ? result.count : null,
        error: result.error ? { message: result.error.message ?? `tool.${table} read failed` } : null,
      })),
    { label: `tool.${table}` },
  );
}

const ENTRY_COLUMNS = "tool_id, job_key, job_family, display_name, state, metadata";
const ENDPOINT_COLUMNS = "id, tool_id, provider_slug, via, vendor_op, state, verified_at, last_probe, metadata";
const PROVIDER_COLUMNS = "slug, admin_name, state, direct_account, metadata";

export interface ControlOverview {
  entries: EntryRow[];
  endpoints: EndpointRow[];
  providers: ProviderRow[];
  cards7: ScorecardRow[];
}

export async function loadControlOverview(): Promise<ControlOverview> {
  const [entries, endpoints, providers, cards7] = await Promise.all([
    readTable<EntryRow>("catalog_entry", ENTRY_COLUMNS, "display_name"),
    readTable<EndpointRow>("catalog_endpoint", ENDPOINT_COLUMNS, "id"),
    readTable<ProviderRow>("catalog_provider", PROVIDER_COLUMNS, "slug"),
    readTable<ScorecardRow>("endpoint_scorecard", "*", "endpoint_id", (q) => q.eq("window_days", 7)),
  ]);
  return { entries, endpoints, providers, cards7 };
}

export interface ToolDetailData {
  entry: EntryRow;
  endpoints: EndpointRow[];
  providers: ProviderRow[];
  cards7: ScorecardRow[];
  cards30: ScorecardRow[];
  strips: StripRow[];
}

export async function loadToolDetail(toolId: string): Promise<ToolDetailData> {
  const [entries, endpoints, providers] = await Promise.all([
    readTable<EntryRow>("catalog_entry", ENTRY_COLUMNS, "display_name", (q) => q.eq("tool_id", toolId)),
    readTable<EndpointRow>("catalog_endpoint", ENDPOINT_COLUMNS, "id", (q) => q.eq("tool_id", toolId)),
    readTable<ProviderRow>("catalog_provider", PROVIDER_COLUMNS, "slug"),
  ]);
  const entry = entries[0];
  if (!entry) throw new Error("That Tool no longer exists.");
  const ids = endpoints.map((e) => e.id);
  const none = ids.length === 0;
  const [cards7, cards30, strips] = none
    ? [[], [], []]
    : await Promise.all([
        readTable<ScorecardRow>("endpoint_scorecard", "*", "endpoint_id", (q) => q.eq("window_days", 7).in("endpoint_id", ids)),
        readTable<ScorecardRow>("endpoint_scorecard", "*", "endpoint_id", (q) => q.eq("window_days", 30).in("endpoint_id", ids)),
        readTable<StripRow>("endpoint_strip", "*", "bucket_start", (q) => q.in("endpoint_id", ids)),
      ]);
  return { entry, endpoints, providers, cards7, cards30, strips };
}

// ── the changes: one server door ─────────────────────────────────────────────────────────────────────

export interface StateChangeResult {
  changed: boolean;
  state: string;
  refusal: string | null;
  message: string;
}
export interface VerifyResult {
  endpoint_id: string;
  passed: boolean;
  state: string;
  call_id: string | null;
  message: string;
}

const BASE = "/admin/tool-control";

export async function verifyEndpoint(endpointId: string): Promise<VerifyResult> {
  return (await postJson<VerifyResult>(`${BASE}/endpoints/${endpointId}/verify`, {})).data;
}
export async function turnOnEndpoint(endpointId: string): Promise<StateChangeResult> {
  return (await postJson<StateChangeResult>(`${BASE}/endpoints/${endpointId}/turn-on`, {})).data;
}
export async function turnOffEndpoint(endpointId: string, to: "paused" | "retired" = "paused"): Promise<StateChangeResult> {
  return (await postJson<StateChangeResult>(`${BASE}/endpoints/${endpointId}/turn-off`, { to })).data;
}
export async function cancelVerification(endpointId: string): Promise<StateChangeResult> {
  return (await postJson<StateChangeResult>(`${BASE}/endpoints/${endpointId}/cancel-verification`, {})).data;
}
export async function setToolPaused(toolId: string, paused: boolean): Promise<StateChangeResult> {
  return (await postJson<StateChangeResult>(`${BASE}/tools/${toolId}/pause`, { paused })).data;
}
export async function setAccountState(slug: string, to: "live" | "paused"): Promise<StateChangeResult> {
  return (await postJson<StateChangeResult>(`${BASE}/providers/${slug}/state`, { to })).data;
}
