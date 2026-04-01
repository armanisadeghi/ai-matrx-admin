import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { AgentExecutionInstance, AgentRunMessage } from "./types";

// ── Root ──────────────────────────────────────────────────────────────────────

const selectRoot = (state: RootState) => state.agentExecution;

// ── Instance ──────────────────────────────────────────────────────────────────

export const selectAllAgentExecutionInstances = createSelector(
  selectRoot,
  (root) => root.instances,
);

export const selectAgentExecutionInstance = (
  state: RootState,
  runId: string,
): AgentExecutionInstance | undefined => state.agentExecution.instances[runId];

export const makeSelectAgentExecutionInstance = (runId: string) =>
  createSelector(selectRoot, (root) => root.instances[runId]);

// ── Messages ──────────────────────────────────────────────────────────────────

export const selectInstanceMessages = (
  state: RootState,
  runId: string,
): AgentRunMessage[] => state.agentExecution.instances[runId]?.messages;

export const selectInstanceHasMessages = (
  state: RootState,
  runId: string,
): boolean => (state.agentExecution.instances[runId]?.messages.length ?? 0) > 0;

// ── Status ────────────────────────────────────────────────────────────────────

export const selectInstanceStatus = (state: RootState, runId: string) =>
  state.agentExecution.instances[runId]?.status ?? "idle";

export const selectIsExecuting = (state: RootState, runId: string): boolean => {
  const instance = state.agentExecution.instances[runId];
  const status = instance?.status;
  return status === "executing" || status === "streaming";
};

export const selectIsStreaming = (state: RootState, runId: string): boolean =>
  state.agentExecution.instances[runId]?.status === "streaming";

export const selectInstanceError = (
  state: RootState,
  runId: string,
): string | null => state.agentExecution.instances[runId]?.error ?? null;

export const selectStreamEnded = (state: RootState, runId: string): boolean =>
  state.agentExecution.instances[runId]?.streamEnded ?? false;

export const selectCurrentTaskId = (
  state: RootState,
  runId: string,
): string | null =>
  state.agentExecution.instances[runId]?.currentTaskId ?? null;

// ── Variables ─────────────────────────────────────────────────────────────────

export const selectVariableValues = (
  state: RootState,
  runId: string,
): Record<string, string> =>
  state.agentExecution.instances[runId]?.variableValues;

export const selectVariableDefaults = (state: RootState, runId: string) =>
  state.agentExecution.instances[runId]?.variableDefaults;

export const selectContextSlots = (state: RootState, runId: string) =>
  state.agentExecution.instances[runId]?.contextSlots;

export const selectRequiresVariableReplacement = (
  state: RootState,
  runId: string,
): boolean =>
  state.agentExecution.instances[runId]?.requiresVariableReplacement;

// ── UI ────────────────────────────────────────────────────────────────────────

export const selectShowVariables = (state: RootState, runId: string): boolean =>
  state.agentExecution.instances[runId]?.showVariables;

export const selectExpandedVariable = (
  state: RootState,
  runId: string,
): string | null =>
  state.agentExecution.instances[runId]?.expandedVariable ?? null;

// ── Input (high-frequency) ────────────────────────────────────────────────────

export const selectCurrentInput = (state: RootState, runId: string): string =>
  state.agentExecution.currentInputs[runId] ?? "";

// ── Identity ──────────────────────────────────────────────────────────────────

export const selectInstanceAgentId = (
  state: RootState,
  runId: string,
): string | null => state.agentExecution.instances[runId]?.agentId ?? null;

export const selectInstanceIsVersion = (
  state: RootState,
  runId: string,
): boolean => state.agentExecution.instances[runId]?.isVersion ?? false;

export const selectInstanceAgentName = (
  state: RootState,
  runId: string,
): string => state.agentExecution.instances[runId]?.agentName ?? "";

// ── Run IDs by agent ──────────────────────────────────────────────────────────

export const selectRunIdsByAgentId = createSelector(
  selectAllAgentExecutionInstances,
  (_: RootState, agentId: string) => agentId,
  (instances, agentId) =>
    Object.values(instances)
      .filter((i) => i.agentId === agentId)
      .map((i) => i.runId),
);

// ── Streaming text (read from socketResponseSlice by taskId) ──────────────────
// Streaming text is NOT duplicated here — read it directly from
// selectPrimaryResponseTextByTaskId(taskId) in socket-response-selectors.
// This keeps streaming data in one place and avoids double-storage.
