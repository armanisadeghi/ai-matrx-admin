/**
 * features/marketing/content-plan/data/aiRuns.ts
 *
 * The content-plan AI run history, read straight from Supabase. Each read is
 * ONE `plan.*` RPC (SECURITY INVOKER — row security decides what the caller
 * may see), replacing the `/content-plan/.../brief-runs` and `/ai-runs` server
 * hops, which only read `chat.agent_run` rows through `platform.associations`.
 * The functions return the exact JSON shape the server returned.
 */
import { supabase } from "@/utils/supabase/client";

export async function fetchBriefRunHistory(nodeId: string): Promise<unknown> {
  const { data, error } = await supabase
    .schema("plan")
    .rpc("brief_run_history", { p_node_id: nodeId });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchSiteAiRuns(siteId: string): Promise<unknown> {
  const { data, error } = await supabase
    .schema("plan")
    .rpc("site_ai_runs", { p_site_id: siteId });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchSiteAiRun(siteId: string, runId: string): Promise<unknown> {
  const { data, error } = await supabase
    .schema("plan")
    .rpc("site_ai_run", { p_site_id: siteId, p_run_id: runId });
  if (error) throw new Error(error.message);
  return data;
}
