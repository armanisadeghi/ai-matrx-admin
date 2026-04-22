import "server-only";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import {
  dbRowToAgentDefinition,
  versionSnapshotRowToAgentDefinition,
} from "@/features/agents/redux/agent-definition/converters";
import type {
  AgentDefinition,
  AgentListRow,
  AgentVersionSnapshot,
} from "@/features/agents/types/agent-definition.types";

/**
 * SSR seed for the agents list page.
 * Uses agx_get_list RPC with pagination — p_limit: 30 for the initial page.
 * Client dispatches fetchAgentsList() (no limit) to backfill all agents.
 */
export const getAgentListSeed = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("agx_get_list", {
    p_limit: 30,
    p_offset: 0,
  });
  if (error) throw error;
  return (data ?? []) as AgentListRow[];
});

/**
 * SSR seed for the admin system-agents list page. Returns every builtin
 * (global/system) agent — no pagination, no scope filter. Backed by
 * agx_get_list_full (same RPC used by `fetchAgentsListFull`) filtered
 * client-side to `agent_type = 'builtin'`.
 *
 * Called from the admin route; client then dispatches `fetchAgentsListFull()`
 * to populate the Redux slice for selectors like `selectBuiltinAgents`.
 */
export const getSystemAgentListSeed = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("agx_get_list_full");
  if (error) throw error;
  const rows = (data ?? []) as AgentListRow[];
  return rows.filter((row) => row.agent_type === "builtin");
});

/**
 * Full live agent row. Wrapped in cache() so layout + generateMetadata + page
 * all call this — React deduplicates to one DB hit per request.
 * Calls notFound() on missing/unauthorized — triggers not-found.tsx.
 */
export const getAgent = cache(async (id: string): Promise<AgentDefinition> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agx_agent")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  return dbRowToAgentDefinition(data);
});

/**
 * Version snapshot for /agents/{id}/{version} comparison page.
 * Uses agx_get_version_snapshot RPC. Result is converted via
 * versionSnapshotRowToAgentDefinition so SSR and client thunk use identical logic.
 */
export const getAgentSnapshot = cache(
  async (id: string, versionNumber: number): Promise<AgentDefinition> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("agx_get_version_snapshot", {
      p_agent_id: id,
      p_version_number: versionNumber,
    });
    if (error) notFound();
    const raw = Array.isArray(data) ? data[0] : data;
    if (!raw) notFound();
    return versionSnapshotRowToAgentDefinition(
      id,
      raw as unknown as AgentVersionSnapshot,
    );
  },
);
