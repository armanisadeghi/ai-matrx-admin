import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import { agentConversationsCacheKey } from "./agent-conversations.types";
import { selectAgentIdFromInstance } from "@/features/agents/redux/execution-system/conversations/conversations.selectors";

export const selectAgentConversationsState = (state: RootState) =>
  state.agentConversations;

export function selectAgentConversationsEntry(
  state: RootState,
  /** Canonical agx_agent.id (same as fetch/cache keys after normalization). */
  agentId: string,
  versionFilter: number | null,
) {
  const key = agentConversationsCacheKey(agentId, versionFilter);
  return state.agentConversations.byCacheKey[key];
}

/**
 * Resolves instance → agent map key → canonical agent id, then reads the list cache.
 */
export function selectAgentConversationsEntryForInstance(
  state: RootState,
  instanceId: string,
  versionFilter: number | null,
) {
  const mapKey = selectAgentIdFromInstance(instanceId)(state);
  if (!mapKey) return undefined;
  const agent = state.agentDefinition.agents?.[mapKey];
  const canonicalAgentId = agent?.parentAgentId ?? agent?.id ?? mapKey;
  return selectAgentConversationsEntry(state, canonicalAgentId, versionFilter);
}

export const makeSelectAgentConversations = (
  agentId: string,
  versionFilter: number | null = null,
) =>
  createSelector(
    (state: RootState) => state.agentConversations.byCacheKey,
    (byCacheKey) => {
      const entry =
        byCacheKey[agentConversationsCacheKey(agentId, versionFilter)];
      return {
        status: entry?.status ?? "idle",
        conversations: entry?.conversations ?? [],
        error: entry?.error ?? null,
      };
    },
  );
