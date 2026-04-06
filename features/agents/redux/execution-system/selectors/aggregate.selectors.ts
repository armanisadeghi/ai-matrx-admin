/**
 * Cross-Cutting Selectors
 *
 * Aggregate selectors that read across multiple slices to produce derived views.
 *
 * CRITICAL: No selector here ever takes agentId as a parameter.
 * Everything needed is owned by the instance slices.
 *
 * SELECTOR RULES (enforced here):
 * - Primitives returned directly — stable by value, safe for useAppSelector.
 * - Arrays/objects from .filter()/.map() ALWAYS wrapped in createSelector.
 * - No ?? [] / ?? {} / ?? null defaults — return undefined, guard in component.
 * - Input selectors: plain state lookups only.
 * - Result functions: all filtering, mapping, and derivation.
 */

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { AssembledAgentStartRequest } from "@/features/agents/types";
import type {
  PendingToolCall,
  RequestStatus,
  ToolLifecycleEntry,
  TimelineEntry,
} from "@/features/agents/types/request.types";
import type {
  Phase,
  ContentBlockPayload,
  CompletionPayload,
} from "@/types/python-generated/stream-events";
import type { ShortcutContext } from "@/features/agents/redux/agent-shortcuts/types";
import { assembleRequest } from "../thunks/execute-instance.thunk";

const EMPTY_IDS: string[] = [];

// =============================================================================
// Instance Status Helpers
// =============================================================================

/** Is this instance currently executing (in-flight or streaming)? */
export const selectIsExecuting =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const status = state.executionInstances?.byInstanceId[instanceId]?.status;
    return status === "running" || status === "streaming";
  };

/** Is this instance actively streaming a response? */
export const selectIsStreaming =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.executionInstances?.byInstanceId[instanceId]?.status === "streaming";

/** Is this instance paused waiting for client tool results? */
export const selectIsAwaitingTools =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.executionInstances?.byInstanceId[instanceId]?.status === "paused";

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
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return "";
    const latest = state.activeRequests?.byRequestId[ids[ids.length - 1]];
    if (!latest) return "";
    // Lazy join: textChunks accumulate via O(1) push during streaming,
    // joined here only when the selector is actually called by a subscriber.
    if (latest.textChunks.length > 0) return latest.textChunks.join("");
    return latest.accumulatedText || "";
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
      state.instanceConversationHistory?.byInstanceId[instanceId]
        ?.conversationId;
    if (historyConversationId) return historyConversationId;

    // Fallback to active request (useful mid-stream, before commitAssistantTurn fires)
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return null;
    const latest = state.activeRequests?.byRequestId[ids[ids.length - 1]];
    return latest?.conversationId ?? null;
  };

/** The current conversation mode for this instance (agent | conversation | chat). */
export const selectConversationMode =
  (instanceId: string) => (state: RootState) =>
    state.instanceConversationHistory?.byInstanceId[instanceId]?.mode ?? "agent";

/**
 * The requestId for the most recent request on this instance.
 * A primitive — safe to use directly with useAppSelector.
 * Returns undefined (not null) so components can guard with `if (!requestId)`.
 */
export const selectLatestRequestId =
  (instanceId: string) =>
  (state: RootState): string | undefined => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    return ids.length > 0 ? ids[ids.length - 1] : undefined;
  };

/**
 * The RequestStatus of the most recent request on this instance.
 * A primitive — safe to use directly with useAppSelector.
 * Returns undefined when no request exists yet.
 */
export const selectLatestRequestStatus =
  (instanceId: string) =>
  (state: RootState): RequestStatus | undefined => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return undefined;
    return state.activeRequests?.byRequestId[ids[ids.length - 1]]?.status;
  };

/**
 * Is the instance in the "connecting" sub-state?
 * True from HTTP send until the first chunk or error arrives.
 * Useful for showing a "waiting for response" skeleton before streaming begins.
 */
export const selectIsConnecting =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return false;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.status ===
      "connecting"
    );
  };

/**
 * Is the instance in the pre-first-token waiting phase?
 * True from submit until the first chunk arrives (status: "running" or "connecting").
 * Used to show the "Planning..." timer to the user.
 *
 * Note: the instance status goes "running" → "streaming" when the first chunk
 * arrives. We want the spinner for the gap between those two states.
 */
export const selectIsWaitingForFirstToken =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const instanceStatus =
      state.executionInstances?.byInstanceId[instanceId]?.status;
    // Running = request in flight but no chunks yet
    if (instanceStatus === "running") return true;

    // Also cover the "connecting" request status (before even the HTTP response)
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return false;
    const latestStatus =
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.status;
    return latestStatus === "connecting";
  };

/**
 * When the most recent request on this instance was submitted (ISO string).
 * Used to drive the pre-first-token elapsed timer in the UI.
 * Returns undefined if no request exists yet.
 */
export const selectLatestRequestStartedAt =
  (instanceId: string) =>
  (state: RootState): string | undefined => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return undefined;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.startedAt ??
      undefined
    );
  };

/**
 * The error message for the most recent request, if it failed.
 * A primitive — safe to use directly with useAppSelector.
 * Returns undefined when no error exists.
 */
export const selectLatestError =
  (instanceId: string) =>
  (state: RootState): string | undefined => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return undefined;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.errorMessage ??
      undefined
    );
  };

/**
 * Unresolved pending tool calls for the most recent request on this instance.
 *
 * Memoized with createSelector — returns a stable array reference when the
 * pending calls haven't changed, preventing re-renders on every chunk arrival.
 *
 * Returns undefined (not []) when no request exists — guard in component.
 */
export const selectPendingToolCallsForInstance = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests?.byInstanceId[instanceId],
    (state: RootState) => state.activeRequests?.byRequestId,
    (instanceIds, byRequestId): PendingToolCall[] | undefined => {
      if (!instanceIds || instanceIds.length === 0) return undefined;
      const latest = byRequestId[instanceIds[instanceIds.length - 1]];
      if (!latest) return undefined;
      return latest.pendingToolCalls.filter((c) => !c.resolved);
    },
  );

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
    const userInput = state.instanceUserInput?.byInstanceId[instanceId];
    const hasText = (userInput?.text?.trim().length ?? 0) > 0;
    if (hasText) return true;

    const resources = state.instanceResources?.byInstanceId[instanceId];
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
    const instance = state.executionInstances?.byInstanceId[instanceId];

    if (!instance) {
      return { ready: false, reasons: ["Instance not found"] };
    }

    // Check resources
    const resources = state.instanceResources?.byInstanceId[instanceId];
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
    const varEntry = state.instanceVariableValues?.byInstanceId[instanceId];
    const definitions = varEntry?.definitions;
    const userValues = varEntry?.userValues;
    const scopeValues = varEntry?.scopeValues;

    if (!definitions || !userValues || !scopeValues) {
      return { ready: reasons.length === 0, reasons };
    }

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
 * Memoized — only recomputes when any of the input slices change.
 */
export const selectInstanceSummary = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.executionInstances?.byInstanceId[instanceId],
    (state: RootState) => state.instanceModelOverrides?.byInstanceId[instanceId],
    (state: RootState) => state.instanceResources?.byInstanceId[instanceId],
    (state: RootState) => state.instanceContext?.byInstanceId[instanceId],
    (state: RootState) => state.instanceUserInput?.byInstanceId[instanceId],
    (state: RootState) => state.instanceUIState?.byInstanceId[instanceId],
    (state: RootState) => state.activeRequests?.byInstanceId[instanceId],
    (state: RootState) => state.activeRequests?.byRequestId,
    (
      instance,
      overrides,
      resources,
      context,
      userInput,
      uiState,
      requestIds,
      byRequestId,
    ) => {
      if (!instance) return null;

      const ids = requestIds ?? EMPTY_IDS;

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
        requestCount: ids.length,
        latestRequestStatus:
          ids.length > 0
            ? (byRequestId[ids[ids.length - 1]]?.status ?? null)
            : null,
      };
    },
  );

// =============================================================================
// Variable Display
// =============================================================================

/**
 * Should the variable input UI be shown for this instance right now?
 *
 * True only when ALL of the following hold:
 *   1. The instance has at least one variable definition.
 *   2. No turns have been committed yet (first message not sent).
 *   3. The instance is not currently executing (mid-stream = too late).
 *
 * Components get a single boolean — all the "why" lives here.
 */
export const selectShouldShowVariables =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const definitions =
      state.instanceVariableValues?.byInstanceId[instanceId]?.definitions;
    if (!definitions || definitions.length === 0) return false;

    const turns =
      state.instanceConversationHistory?.byInstanceId[instanceId]?.turns;
    if (turns && turns.length > 0) return false;

    const status = state.executionInstances?.byInstanceId[instanceId]?.status;
    if (status === "running" || status === "streaming") return false;

    return true;
  };

// =============================================================================
// Conversation → Instance Lookup
// =============================================================================

/**
 * Find an existing instanceId that is already associated with a conversationId.
 *
 * Used when navigating to /c/[conversationId] after a stream starts on the
 * welcome screen. The stream wrote conversationId into both:
 *   - instanceConversationHistory[instanceId].conversationId  (primary)
 *   - activeRequests[requestId].conversationId                (mid-stream fallback)
 *
 * If an instance is found, the conversation page reuses it directly — the
 * stream continues uninterrupted and no fetchConversationHistory is needed.
 *
 * If null is returned, the page should create a fresh instance and load
 * history from the database.
 *
 * Returns the instanceId string, or null.
 */
export const selectInstanceIdByConversationId =
  (conversationId: string) =>
  (state: RootState): string | null => {
    // 1. Primary: check instanceConversationHistory — authoritative after commitAssistantTurn
    for (const instanceId of state.executionInstances?.allInstanceIds) {
      const historyEntry =
        state.instanceConversationHistory?.byInstanceId[instanceId];
      if (historyEntry?.conversationId === conversationId) return instanceId;
    }

    // 2. Fallback: check activeRequests — catches mid-stream before commit fires
    for (const instanceId of state.executionInstances?.allInstanceIds) {
      const requestIds =
        state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
      for (const requestId of requestIds) {
        if (
          state.activeRequests?.byRequestId[requestId]?.conversationId ===
          conversationId
        ) {
          return instanceId;
        }
      }
    }

    return null;
  };

// =============================================================================
// Display Mode — Cross-Slice Rendering Selectors
// =============================================================================
//
// These combine executionInstances + instanceUIState to give a shell renderer
// exactly what it needs: which instances are visible, in what mode, and at
// what execution state. A single dispatch(setDisplayMode(...)) changes the
// mode, and the correct shell component re-renders automatically.
//
// Factory pattern used (makeSelect*) because multiple shell components may
// render concurrently — each gets its own memoized selector instance.

/**
 * Factory for a selector that returns a combined snapshot of an instance's
 * display mode and execution status together.
 *
 * Use `useMemo(makeSelectInstanceDisplaySnapshot, [])` in a component so each
 * instance gets its own memoized selector (createSelector cache size = 1).
 *
 * Returns undefined when the instance doesn't exist.
 */
export const makeSelectInstanceDisplaySnapshot = () =>
  createSelector(
    (state: RootState, instanceId: string) =>
      state.instanceUIState?.byInstanceId[instanceId],
    (state: RootState, instanceId: string) =>
      state.executionInstances?.byInstanceId[instanceId],
    (uiState, instance) => {
      if (!uiState || !instance) return undefined;
      return {
        displayMode: uiState.displayMode,
        isExpanded: uiState.isExpanded,
        allowChat: uiState.allowChat,
        instanceStatus: instance.status,
        agentId: instance.agentId,
        origin: instance.origin,
      } as const;
    },
  );

/**
 * All instanceIds that have an active execution (running, streaming, or
 * awaiting tools) grouped by their display mode.
 *
 * This is the primary input for an "ActiveAgentShell" component that needs
 * to know what to render and where — without scanning every instance.
 *
 * Memoized — only recomputes when the instance or UI state maps change.
 * Returns undefined (not {}) when there are no active instances.
 */
export const selectActiveInstancesByDisplayMode = createSelector(
  (state: RootState) => state.executionInstances?.byInstanceId,
  (state: RootState) => state.instanceUIState?.byInstanceId,
  (byInstanceId, byUIState) => {
    type DisplayModeMap = Record<string, string[]>;
    const result: DisplayModeMap = {};
    let hasAny = false;

    for (const instanceId of Object.keys(byInstanceId)) {
      const instance = byInstanceId[instanceId];
      if (!instance) continue;
      const { status } = instance;
      if (
        status !== "running" &&
        status !== "streaming" &&
        status !== "paused" &&
        status !== "complete"
      )
        continue;

      const mode = byUIState[instanceId]?.displayMode;
      if (!mode) continue;

      if (!result[mode]) result[mode] = [];
      result[mode].push(instanceId);
      hasAny = true;
    }

    return hasAny ? result : undefined;
  },
);

/**
 * Returns overlay-managed instances grouped by display mode.
 *
 * "direct" and "background" modes are excluded — those are rendered
 * by their host component (AgentRunPage, builder, chat).
 * Every other display mode is rendered centrally by the OverlayController.
 *
 * Excludes "draft" status since the instance isn't ready yet.
 */
export const selectOverlayInstancesByDisplayMode = createSelector(
  (state: RootState) => state.executionInstances?.byInstanceId,
  (state: RootState) => state.instanceUIState?.byInstanceId,
  (byInstanceId, byUIState) => {
    type DisplayModeMap = Record<string, string[]>;
    const result: DisplayModeMap = {};
    let hasAny = false;

    for (const instanceId of Object.keys(byInstanceId)) {
      const instance = byInstanceId[instanceId];
      if (!instance) continue;

      const { status } = instance;
      if (status === "draft") continue;

      const mode = byUIState[instanceId]?.displayMode;
      if (!mode || mode === "direct" || mode === "background") continue;

      if (!result[mode]) result[mode] = [];
      result[mode].push(instanceId);
      hasAny = true;
    }

    return hasAny ? result : undefined;
  },
);

/**
 * All instanceIds that should be rendered as modals right now.
 * Combines: displayMode is modal-full or modal-compact AND status is past draft.
 * Memoized.
 */
export const selectActiveModalInstanceIds = createSelector(
  (state: RootState) => state.executionInstances?.byInstanceId,
  (state: RootState) => state.instanceUIState?.byInstanceId,
  (byInstanceId, byUIState): string[] | undefined => {
    const ids = Object.keys(byInstanceId).filter((id) => {
      const status = byInstanceId[id]?.status;
      if (status === "draft" || status === undefined) return false;
      const mode = byUIState[id]?.displayMode;
      return mode === "modal-full" || mode === "modal-compact";
    });
    return ids.length > 0 ? ids : undefined;
  },
);

/**
 * All instanceIds that should be rendered as persistent panels or chat bubbles.
 * These stay mounted even when not actively streaming.
 * Memoized.
 */
export const selectActivePanelInstanceIds = createSelector(
  (state: RootState) => state.executionInstances?.byInstanceId,
  (state: RootState) => state.instanceUIState?.byInstanceId,
  (byInstanceId, byUIState): string[] | undefined => {
    const ids = Object.keys(byInstanceId).filter((id) => {
      const status = byInstanceId[id]?.status;
      if (status === "draft" || status === undefined) return false;
      const mode = byUIState[id]?.displayMode;
      return mode === "panel" || mode === "chat-bubble";
    });
    return ids.length > 0 ? ids : undefined;
  },
);

// =============================================================================
// Instance-Level Bridges — Phase (V2 — replaces status updates)
// =============================================================================

/**
 * The latest phase for this instance's most recent request.
 * Drives the progress indicator (connected, processing, generating, etc.).
 * Returns null when no phase events have arrived yet.
 */
export const selectLatestCurrentPhase =
  (instanceId: string) =>
  (state: RootState): Phase | null => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return null;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.currentPhase ??
      null
    );
  };

/**
 * The latest info event's userMessage for the most recent request.
 * Used during interstitial phases to show the server's user-facing status
 * (e.g. "Planning next steps...") instead of raw phase names.
 */
export const selectLatestInfoUserMessage =
  (instanceId: string) =>
  (state: RootState): string | null => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return null;
    const request = state.activeRequests?.byRequestId[ids[ids.length - 1]];
    if (!request || request.infoEvents.length === 0) return null;
    return (
      request.infoEvents[request.infoEvents.length - 1]?.user_message ?? null
    );
  };

// =============================================================================
// Instance-Level Bridges — Content Blocks
// =============================================================================

/**
 * All content blocks from the latest request on this instance, in order.
 * Memoized — stable reference until a new block arrives.
 */
export const selectLatestContentBlocks = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests?.byInstanceId[instanceId],
    (state: RootState) => state.activeRequests?.byRequestId,
    (instanceIds, byRequestId): ContentBlockPayload[] => {
      if (!instanceIds || instanceIds.length === 0) return [];
      const latest = byRequestId[instanceIds[instanceIds.length - 1]];
      if (!latest) return [];
      return latest.contentBlockOrder
        .map((id) => latest.contentBlocks[id])
        .filter((b): b is ContentBlockPayload => b != null);
    },
  );

/**
 * Content block count for the latest request. Primitive — safe for useAppSelector.
 */
export const selectLatestContentBlockCount =
  (instanceId: string) =>
  (state: RootState): number => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return 0;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.contentBlockOrder
        .length ?? 0
    );
  };

// =============================================================================
// Instance-Level Bridges — Tool Lifecycle
// =============================================================================

/**
 * All active (in-progress) tools for this instance's latest request.
 * Memoized.
 */
export const selectLatestActiveTools = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests?.byInstanceId[instanceId],
    (state: RootState) => state.activeRequests?.byRequestId,
    (instanceIds, byRequestId): ToolLifecycleEntry[] => {
      if (!instanceIds || instanceIds.length === 0) return [];
      const latest = byRequestId[instanceIds[instanceIds.length - 1]];
      if (!latest) return [];
      return Object.values(latest.toolLifecycle).filter(
        (t) =>
          t.status === "started" ||
          t.status === "progress" ||
          t.status === "step",
      );
    },
  );

/**
 * All tool lifecycle entries for this instance's latest request.
 * Memoized.
 */
export const selectLatestToolLifecycles = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests?.byInstanceId[instanceId],
    (state: RootState) => state.activeRequests?.byRequestId,
    (instanceIds, byRequestId): ToolLifecycleEntry[] => {
      if (!instanceIds || instanceIds.length === 0) return [];
      const latest = byRequestId[instanceIds[instanceIds.length - 1]];
      if (!latest) return [];
      return Object.values(latest.toolLifecycle);
    },
  );

// =============================================================================
// Instance-Level Bridges — Completion
// =============================================================================

/**
 * The completion payload for this instance's latest request.
 * null until the stream finishes.
 */
export const selectLatestCompletion =
  (instanceId: string) =>
  (state: RootState): CompletionPayload | null => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return null;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.completion ?? null
    );
  };

// =============================================================================
// Instance-Level Bridges — Errors
// =============================================================================

/**
 * Whether the latest error on this instance was fatal (stream killed).
 * Combine with selectLatestError to decide if the user needs a recovery path.
 */
export const selectLatestErrorIsFatal =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return false;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.errorIsFatal ??
      false
    );
  };

// =============================================================================
// Instance-Level Bridges — Timeline
// =============================================================================

/**
 * The full timeline for this instance's latest request.
 * Stable reference — array only grows, never shrinks mid-stream.
 */
export const selectLatestTimeline =
  (instanceId: string) =>
  (state: RootState): TimelineEntry[] | undefined => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return undefined;
    return state.activeRequests?.byRequestId[ids[ids.length - 1]]?.timeline;
  };

/**
 * Whether the latest request is currently inside a text-streaming run.
 * Useful to distinguish "actively receiving text" from "streaming but doing
 * non-text work" (tools, status updates, etc.).
 */
export const selectIsInTextRun =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return false;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.isTextStreaming ??
      false
    );
  };

/** Whether reasoning tokens are currently streaming for the latest request. */
export const selectIsReasoningStreaming =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return false;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]
        ?.isReasoningStreaming ?? false
    );
  };

/** Accumulated reasoning text for the latest request. */
export const selectLatestAccumulatedReasoning =
  (instanceId: string) =>
  (state: RootState): string => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return "";
    const latest = state.activeRequests?.byRequestId[ids[ids.length - 1]];
    if (!latest) return "";
    if (latest.reasoningChunks.length > 0)
      return latest.reasoningChunks.join("");
    return latest.accumulatedReasoning || "";
  };

/** Record reservations for the latest request. */
export const selectLatestReservations =
  (instanceId: string) =>
  (
    state: RootState,
  ):
    | Record<
        string,
        import("@/features/agents/types/request.types").ReservationRecord
      >
    | undefined => {
    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return undefined;
    return state.activeRequests?.byRequestId[ids[ids.length - 1]]?.reservations;
  };

// =============================================================================
// Stream Phase — unified rendering state
// =============================================================================

/**
 * Which visual phase the stream is in. Components render different UI for each.
 *
 * - idle: no active request
 * - connecting: HTTP request in flight, no server events yet
 * - pre_token: server events arriving (status updates, data) but no text yet
 * - reasoning: reasoning/thinking tokens streaming
 * - text_streaming: text chunks actively flowing
 * - interstitial: between text runs (tools, status updates, more planning)
 * - complete: stream finished
 * - error: fatal error
 */
export type StreamPhase =
  | "idle"
  | "connecting"
  | "pre_token"
  | "reasoning"
  | "text_streaming"
  | "interstitial"
  | "complete"
  | "error";

export const selectStreamPhase =
  (instanceId: string) =>
  (state: RootState): StreamPhase => {
    const instance = state.executionInstances?.byInstanceId[instanceId];
    if (!instance) return "idle";

    const instanceStatus = instance.status;

    if (instanceStatus === "draft" || instanceStatus === "ready") return "idle";
    if (instanceStatus === "complete") return "complete";
    if (instanceStatus === "error") return "error";

    const ids = state.activeRequests?.byInstanceId[instanceId] ?? EMPTY_IDS;
    if (ids.length === 0) return "idle";

    const request = state.activeRequests?.byRequestId[ids[ids.length - 1]];
    if (!request) return "idle";

    if (request.status === "error") return "error";
    if (request.status === "complete") return "complete";
    if (request.status === "connecting") return "connecting";

    if (request.isReasoningStreaming) return "reasoning";
    if (request.isTextStreaming) return "text_streaming";

    if (request.textChunks.length > 0 && request.status === "streaming") {
      return "interstitial";
    }

    if (request.status === "streaming" || request.status === "pending") {
      return "pre_token";
    }

    return "idle";
  };

// =============================================================================
// Shortcut Selectors
// =============================================================================

/**
 * Get shortcuts available for the current UI context.
 * Memoized — stable reference when shortcuts map hasn't changed.
 */
export const makeSelectAvailableShortcuts = (context: ShortcutContext) =>
  createSelector(
    (state: RootState) => state.agentShortcut.shortcuts,
    (shortcuts) =>
      Object.values(shortcuts)
        .filter(
          (s) => s != null && s.isActive && s.enabledContexts.includes(context),
        )
        .sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0)),
  );

/**
 * @deprecated Use makeSelectAvailableShortcuts(context) factory instead.
 * This non-memoized version creates a new array on every call.
 */
export const selectAvailableShortcuts =
  (context: ShortcutContext) => (state: RootState) => {
    return Object.values(state.agentShortcut.shortcuts)
      .filter(
        (s) => s != null && s.isActive && s.enabledContexts.includes(context),
      )
      .sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
  };
