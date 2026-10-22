/**
 * The agent catalog a coding session's picker reads, from this page: the same two reads the
 * computer makes (a catalog RPC as the signed-in person, and an agent's light summary), so the
 * picker on the web is the Mac's picker with the same data. The computer then loads the chosen
 * agent with its own sign-in; nothing here sends a token to it.
 */
import type { AgentCatalogRpcRequest, AgentCatalogRpcResult, AgentDetails } from "@ai-matrx/coding-sessions";

import { supabase } from "@/utils/supabase/client";
import { createMatrxTransport } from "@/lib/api/matrx-transport";
import type { RootState } from "@/lib/redux/store";

/** The catalog reads that moved out of `public` (the `public` forwarders are a 72-hour box); every other one is still `public`. */
const MOVED_CATALOG_RPC_SCHEMA: Readonly<Record<string, string>> = { ues_list: "users", ues_touch: "users" };

export function webAgentCatalog(getState: () => RootState) {
  return {
    async catalogRpc(request: AgentCatalogRpcRequest): Promise<AgentCatalogRpcResult> {
      let query = supabase.schema((MOVED_CATALOG_RPC_SCHEMA[request.fn] ?? "public") as "public").rpc(request.fn as never, (request.args ?? {}) as never, request.count ? { count: request.count } : undefined);
      if (request.order) query = query.order(request.order.column, { ascending: request.order.ascending !== false }) as typeof query;
      if (request.range) query = query.range(request.range[0], request.range[1]) as typeof query;
      const { data, error, count } = await query;
      return {
        data,
        error: error ? { message: error.message, code: error.code, details: error.details ?? null, hint: error.hint ?? null } : null,
        count: count ?? null,
      };
    },
    async details(agentId: string): Promise<AgentDetails> {
      const { fetchPortableAgentSummary } = await import("@ai-matrx/agents/portable");
      const summary = await fetchPortableAgentSummary(createMatrxTransport(getState, { source: "deviceCodingSessions" }), agentId);
      return {
        agentId: summary.agent_id,
        name: summary.name,
        variables: summary.variables,
        versions: summary.versions.map((v) => ({ id: v.id, versionNumber: v.version_number, changedAt: v.changed_at })),
        latestVersionNumber: summary.version_number,
        latestVersionId: summary.version_id,
      };
    },
  };
}
