import type { RootState } from "@/lib/redux/store";
import type { ExecutionInstance } from "@/features/agents/types";

export const selectInstance =
  (instanceId: string) =>
  (state: RootState): ExecutionInstance | undefined =>
    state.executionInstances.byInstanceId[instanceId];

export const selectAllInstanceIds = (state: RootState): string[] =>
  state.executionInstances.allInstanceIds;

export const selectInstancesByAgent =
  (agentId: string) =>
  (state: RootState): ExecutionInstance[] =>
    state.executionInstances.allInstanceIds
      .map((id) => state.executionInstances.byInstanceId[id])
      .filter((inst): inst is ExecutionInstance => inst?.agentId === agentId);

export const selectInstanceStatus =
  (instanceId: string) => (state: RootState) =>
    state.executionInstances.byInstanceId[instanceId]?.status;

export const selectRunningInstances = (state: RootState): ExecutionInstance[] =>
  state.executionInstances.allInstanceIds
    .map((id) => state.executionInstances.byInstanceId[id])
    .filter(
      (inst): inst is ExecutionInstance =>
        inst != null &&
        (inst.status === "running" || inst.status === "streaming"),
    );

export const selectAgentIdFromInstance =
  (instanceId: string) =>
  (state: RootState): string | undefined =>
    state.executionInstances.byInstanceId[instanceId]?.agentId;
