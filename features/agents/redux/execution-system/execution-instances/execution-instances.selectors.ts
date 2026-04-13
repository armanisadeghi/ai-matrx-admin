import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { ExecutionInstance } from "@/features/agents/types";

const EMPTY_INSTANCES: ExecutionInstance[] = [];
const EMPTY_CONVERSATION_IDS_BY_AGENT: Record<string, string[]> = {};

export const selectInstance =
  (conversationId: string) =>
  (state: RootState): ExecutionInstance | undefined =>
    state.executionInstances.byConversationId[conversationId];

export const selectAllConversationIds = (state: RootState): string[] =>
  state.executionInstances.allConversationIds;

/** @deprecated Use selectAllConversationIds */
export const selectAllInstanceIds = selectAllConversationIds;

/** Conversation IDs grouped by agent ID; stable empty object when none. */
export const selectConversationIdsByAgent = createSelector(
  (state: RootState) => state.executionInstances.allConversationIds,
  (state: RootState) => state.executionInstances.byConversationId,
  (allIds, byId): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    for (const cid of allIds) {
      const inst = byId[cid];
      if (!inst) continue;
      const aid = inst.agentId;
      if (!map[aid]) map[aid] = [];
      map[aid].push(cid);
    }
    return Object.keys(map).length === 0
      ? EMPTY_CONVERSATION_IDS_BY_AGENT
      : map;
  },
);

export const selectInstancesByAgent = (agentId: string) =>
  createSelector(
    (state: RootState) => state.executionInstances.allConversationIds,
    (state: RootState) => state.executionInstances.byConversationId,
    (allIds, byId): ExecutionInstance[] => {
      const result = allIds
        .map((id) => byId[id])
        .filter((inst): inst is ExecutionInstance => inst?.agentId === agentId);
      return result.length === 0 ? EMPTY_INSTANCES : result;
    },
  );

export const selectInstanceStatus =
  (conversationId: string) => (state: RootState) =>
    state.executionInstances.byConversationId[conversationId]?.status;

export const selectRunningInstances = createSelector(
  (state: RootState) => state.executionInstances.allConversationIds,
  (state: RootState) => state.executionInstances.byConversationId,
  (allIds, byId): ExecutionInstance[] => {
    const result = allIds
      .map((id) => byId[id])
      .filter(
        (inst): inst is ExecutionInstance =>
          inst != null &&
          (inst.status === "running" || inst.status === "streaming"),
      );
    return result.length === 0 ? EMPTY_INSTANCES : result;
  },
);

export const selectAgentIdFromInstance =
  (conversationId: string) =>
  (state: RootState): string | undefined =>
    state.executionInstances.byConversationId[conversationId]?.agentId;

export const selectIsCacheOnly =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.executionInstances.byConversationId[conversationId]?.cacheOnly ??
    true;
