import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { ExecutionInstance } from "@/features/agents/types";

const EMPTY_INSTANCES: ExecutionInstance[] = [];

export const selectInstance =
  (instanceId: string) =>
  (state: RootState): ExecutionInstance | undefined =>
    state.executionInstances.byInstanceId[instanceId];

export const selectAllInstanceIds = (state: RootState): string[] =>
  state.executionInstances.allInstanceIds;

export const selectInstancesByAgent = (agentId: string) =>
  createSelector(
    (state: RootState) => state.executionInstances.allInstanceIds,
    (state: RootState) => state.executionInstances.byInstanceId,
    (allIds, byId): ExecutionInstance[] => {
      const result = allIds
        .map((id) => byId[id])
        .filter((inst): inst is ExecutionInstance => inst?.agentId === agentId);
      return result.length === 0 ? EMPTY_INSTANCES : result;
    },
  );

export const selectInstanceStatus =
  (instanceId: string) => (state: RootState) =>
    state.executionInstances.byInstanceId[instanceId]?.status;

export const selectRunningInstances = createSelector(
  (state: RootState) => state.executionInstances.allInstanceIds,
  (state: RootState) => state.executionInstances.byInstanceId,
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
  (instanceId: string) =>
  (state: RootState): string | undefined =>
    state.executionInstances.byInstanceId[instanceId]?.agentId;
