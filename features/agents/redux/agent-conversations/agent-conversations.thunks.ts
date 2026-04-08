import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";
import type { AppThunk, RootState } from "@/lib/redux/store";
import type {
  AgentConversationListItem,
  AgentConversationsRequestIdentity,
} from "./agent-conversations.types";
import { agentConversationsCacheKey } from "./agent-conversations.types";
import { selectAgentIdFromInstance } from "@/features/agents/redux/execution-system/execution-instances/execution-instances.selectors";

type GetAgentConversationsReturns =
  Database["public"]["Functions"]["get_agent_conversations"]["Returns"];
type RpcRow = GetAgentConversationsReturns[number];

/** Pass-through to RPC after normalization (canonical agx_agent.id). */
export interface FetchAgentConversationsNormalizedArgs {
  agentId: string;
  versionFilter: number | null;
}

/**
 * UI / components: either `agentId` (any id that exists in agentDefinition.agents)
 * or `instanceId`. Map-key ids (including version snapshot ids) are resolved to
 * canonical `p_agent_id` for get_agent_conversations.
 */
export type FetchAgentConversationsArgInput =
  | { agentId: string; versionFilter?: number | null; instanceId?: never }
  | { instanceId: string; versionFilter?: number | null; agentId?: never };

/** @deprecated Use FetchAgentConversationsArgInput */
export type FetchAgentConversationsArgs = FetchAgentConversationsArgInput;

export interface FetchAgentConversationsResult {
  cacheKey: string;
  request: AgentConversationsRequestIdentity;
  conversations: AgentConversationListItem[];
}

/**
 * Resolve map-key → canonical agx_agent.id for list RPC + cache keys.
 */
export function resolveCanonicalAgentIdForConversationsFetch(
  input: FetchAgentConversationsArgInput,
  state: RootState,
): { canonicalAgentId: string; versionFilter: number | null } | null {
  const versionFilter =
    input.versionFilter === undefined ? null : input.versionFilter;

  let mapKey: string | undefined;
  if ("agentId" in input && input.agentId) {
    mapKey = input.agentId;
  } else if ("instanceId" in input && input.instanceId) {
    mapKey = selectAgentIdFromInstance(input.instanceId)(state);
  }

  if (!mapKey) return null;

  const agent = state.agentDefinition.agents?.[mapKey];
  const canonicalAgentId = agent?.parentAgentId ?? agent?.id ?? mapKey;

  return { canonicalAgentId, versionFilter };
}

/**
 * Maps one RPC row → app shape (snake_case → camelCase).
 */
export function mapRpcRowToAgentConversationListItem(
  row: RpcRow,
): AgentConversationListItem {
  return {
    conversationId: row.conversation_id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    messageCount: row.message_count,
    agentVersionNumber: row.agent_version_number,
    initialAgentVersionId: row.initial_agent_version_id,
    lastModelId: row.last_model_id,
    sourceApp: row.source_app,
    sourceFeature: row.source_feature,
  };
}

/**
 * Low-level thunk (normalized agent id only). Prefer `fetchAgentConversations` from components.
 */
export const fetchAgentConversationsNormalized = createAsyncThunk<
  FetchAgentConversationsResult,
  FetchAgentConversationsNormalizedArgs,
  { rejectValue: string }
>("agentConversations/fetchNormalized", async (args, { rejectWithValue }) => {
  const { agentId, versionFilter } = args;

  const rpcArgs: Database["public"]["Functions"]["get_agent_conversations"]["Args"] =
    {
      p_agent_id: agentId,
      ...(versionFilter !== null ? { p_version_number: versionFilter } : {}),
    };

  const { data, error } = await supabase.rpc(
    "get_agent_conversations",
    rpcArgs,
  );

  if (error) {
    return rejectWithValue(error.message);
  }

  const rows = data ?? [];
  const conversations = rows.map(mapRpcRowToAgentConversationListItem);
  const request: AgentConversationsRequestIdentity = {
    agentId,
    versionFilter,
  };

  return {
    cacheKey: agentConversationsCacheKey(agentId, versionFilter),
    request,
    conversations,
  };
});

/**
 * Fetches agent conversation lists using either a canonical/map `agentId` or an `instanceId`
 * (resolved to canonical id via agentDefinition).
 */
export function fetchAgentConversations(
  input: FetchAgentConversationsArgInput,
): AppThunk<Promise<FetchAgentConversationsResult>> {
  return async (dispatch, getState) => {
    const resolved = resolveCanonicalAgentIdForConversationsFetch(
      input,
      getState() as RootState,
    );
    if (!resolved) {
      throw new Error(
        "fetchAgentConversations: pass agentId or a valid instanceId with an execution instance",
      );
    }
    const { canonicalAgentId, versionFilter } = resolved;
    return dispatch(
      fetchAgentConversationsNormalized({
        agentId: canonicalAgentId,
        versionFilter,
      }),
    ).unwrap();
  };
}
