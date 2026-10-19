import { createClient } from "@/utils/supabase/client";
import type { CanaryRunRow, WatchtowerSnapshot } from "./types";

/** The generated database types predate these tables and doors; the calls are typed by hand until the next regeneration. */
type LooseRpc = { rpc: (fn: string) => PromiseLike<{ data: unknown; error: { message: string } | null }> };
interface LooseQuery extends PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> {
  eq(column: string, value: string): LooseQuery;
  order(column: string, opts: { ascending: boolean }): LooseQuery;
  limit(n: number): LooseQuery;
}
interface LooseFrom {
  from(table: string): { select(columns: string): LooseQuery };
}

export async function loadSnapshot(): Promise<WatchtowerSnapshot> {
  const { data, error } = await (createClient().schema("tool") as unknown as LooseRpc).rpc("watchtower_snapshot");
  // access-errors: ok — a super-admin read; the page shows the failure through its read state
  if (error) throw new Error(error.message);
  return data as WatchtowerSnapshot;
}

const RUN_COLUMNS =
  "id,feature_key,route,method,outcome,http_status,call_status,seconds,points,sanity,subject_label,edge_case,error_text,call_id,trigger,ran_at";

export async function loadRuns(featureKey: string, limit = 100): Promise<CanaryRunRow[]> {
  const { data, error } = await (createClient().schema("tool") as unknown as LooseFrom)
    .from("canary_run")
    .select(RUN_COLUMNS)
    .eq("feature_key", featureKey)
    .order("ran_at", { ascending: false })
    .limit(limit);
  // access-errors: ok — a super-admin read; the page shows the failure through its read state
  if (error) throw new Error(error.message);
  return (data ?? []) as CanaryRunRow[];
}
