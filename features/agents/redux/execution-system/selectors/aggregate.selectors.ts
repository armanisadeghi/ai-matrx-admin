/**
 * Cross-Cutting Selectors
 *
 * Aggregate selectors that read across multiple slices to produce derived views.
 *
 * CRITICAL: No selector here ever takes agentId as a parameter.
 * Everything needed is owned by the instance slices.
 */

import type { RootState } from "@/lib/redux/store";
import type { AssembledAgentStartRequest } from "@/features/agents/types";
import type { ShortcutContext } from "@/features/agents/redux/agent-shortcuts/types";
import { assembleRequest } from "../thunks/execute-instance.thunk";

// =============================================================================
// Instance Status Helpers
// =============================================================================

/** Is this instance currently executing (in-flight or streaming)? */
export const selectIsExecuting =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const status = state.executionInstances.byInstanceId[instanceId]?.status;
    return status === "running" || status === "streaming";
  };

/** Is this instance actively streaming a response? */
export const selectIsStreaming =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.executionInstances.byInstanceId[instanceId]?.status === "streaming";

/** Is this instance paused waiting for client tool results? */
export const selectIsAwaitingTools =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.executionInstances.byInstanceId[instanceId]?.status === "paused";

// =============================================================================
// Derived Request Selectors (instanceId → latest request data)
// =============================================================================

/**
 * The accumulated response text for the latest request on this instance.
 * Components only have instanceId — this bridges to the latest requestId.
 */
export const selectLatestAccumulatedText =
  (instanceId: string) =>
  (state: RootState): string => {
    const ids = state.activeRequests.byInstanceId[instanceId] ?? [];
    if (ids.length === 0) return "";
    const latest = state.activeRequests.byRequestId[ids[ids.length - 1]];
    return latest?.accumulatedText ?? "";
  };

/**
 * The conversation ID for this instance.
 * Primary source: instanceConversationHistory (persists across request resets).
 * Fallback: latest activeRequest (available mid-stream before history is committed).
 */
export const selectLatestConversationId =
  (instanceId: string) =>
  (state: RootState): string | null => {
    // Prefer the history slice — it's the persistent record
    const historyConversationId =
      state.instanceConversationHistory.byInstanceId[instanceId]
        ?.conversationId;
    if (historyConversationId) return historyConversationId;

    // Fallback to active request (useful mid-stream, before commitAssistantTurn fires)
    const ids = state.activeRequests.byInstanceId[instanceId] ?? [];
    if (ids.length === 0) return null;
    const latest = state.activeRequests.byRequestId[ids[ids.length - 1]];
    return latest?.conversationId ?? null;
  };

/** The current conversation mode for this instance (agent | conversation | chat). */
export const selectConversationMode =
  (instanceId: string) => (state: RootState) =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.mode ?? "agent";

// =============================================================================
// Send-Button Logic
// =============================================================================

/**
 * Does this instance have anything to send?
 * True if the text input is non-empty OR there are attached resources.
 * Use this for the send-button enabled state.
 */
export const selectHasAnyContent =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const userInput = state.instanceUserInput.byInstanceId[instanceId];
    const hasText = (userInput?.text?.trim().length ?? 0) > 0;
    if (hasText) return true;

    const resources = state.instanceResources.byInstanceId[instanceId];
    return resources != null && Object.keys(resources).length > 0;
  };

// =============================================================================
// Instance Ready Check
// =============================================================================

/**
 * Is this instance ready to execute?
 * Checks: all resources resolved, no missing required variables.
 * Uses only instance-owned data — no agentId needed.
 */
export const selectIsInstanceReady =
  (instanceId: string) =>
  (state: RootState): { ready: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    const instance = state.executionInstances.byInstanceId[instanceId];

    if (!instance) {
      return { ready: false, reasons: ["Instance not found"] };
    }

    // Check resources
    const resources = state.instanceResources.byInstanceId[instanceId];
    if (resources) {
      const pending = Object.values(resources).filter(
        (r) => r.status === "pending" || r.status === "resolving",
      );
      if (pending.length > 0) {
        reasons.push(`${pending.length} resource(s) still resolving`);
      }

      const errored = Object.values(resources).filter(
        (r) => r.status === "error" && !r.options.optionalContext,
      );
      if (errored.length > 0) {
        reasons.push(`${errored.length} required resource(s) failed`);
      }
    }

    // Check required variables — uses instance-owned definitions snapshot
    const varEntry = state.instanceVariableValues.byInstanceId[instanceId];
    const definitions = varEntry?.definitions ?? [];
    const userValues = varEntry?.userValues ?? {};
    const scopeValues = varEntry?.scopeValues ?? {};

    for (const def of definitions) {
      if (!def.required) continue;
      const hasValue =
        def.name in userValues ||
        def.name in scopeValues ||
        (def.defaultValue !== undefined && def.defaultValue !== null);
      if (!hasValue) {
        reasons.push(`Required variable "${def.name}" is missing`);
      }
    }

    return { ready: reasons.length === 0, reasons };
  };

// =============================================================================
// Debug / Summary
// =============================================================================

/**
 * Preview the assembled API request for an instance.
 * Useful for debugging / "preview request" UI.
 */
export const selectAssembledRequest =
  (instanceId: string) =>
  (state: RootState): AssembledAgentStartRequest | null =>
    assembleRequest(state, instanceId);

/**
 * Complete summary of an instance's current state.
 * Uses only instance-owned data — agentDefinition is never read here.
 * The instanceId is the only key needed.
 */
export const selectInstanceSummary =
  (instanceId: string) => (state: RootState) => {
    const instance = state.executionInstances.byInstanceId[instanceId];
    if (!instance) return null;

    const overrides = state.instanceModelOverrides.byInstanceId[instanceId];
    const resources = state.instanceResources.byInstanceId[instanceId];
    const context = state.instanceContext.byInstanceId[instanceId];
    const userInput = state.instanceUserInput.byInstanceId[instanceId];
    const uiState = state.instanceUIState.byInstanceId[instanceId];
    const requestIds = state.activeRequests.byInstanceId[instanceId] ?? [];

    return {
      instanceId,
      agentId: instance.agentId,
      origin: instance.origin,
      status: instance.status,
      overrideCount:
        Object.keys(overrides?.overrides ?? {}).length +
        (overrides?.removals.length ?? 0),
      resourceCount: Object.keys(resources ?? {}).length,
      contextCount: Object.keys(context ?? {}).length,
      hasUserInput:
        (userInput?.text?.trim().length ?? 0) > 0 ||
        (userInput?.contentBlocks?.length ?? 0) > 0,
      displayMode: uiState?.displayMode ?? "modal-full",
      requestCount: requestIds.length,
      latestRequestStatus:
        requestIds.length > 0
          ? state.activeRequests.byRequestId[requestIds[requestIds.length - 1]]
              ?.status
          : null,
    };
  };

// =============================================================================
// Shortcut Selectors
// =============================================================================

/**
 * Get shortcuts available for the current UI context.
 */
export const selectAvailableShortcuts =
  (context: ShortcutContext) => (state: RootState) => {
    return Object.values(state.agentShortcut.shortcuts)
      .filter(
        (s) => s != null && s.isActive && s.enabledContexts.includes(context),
      )
      .sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
  };
