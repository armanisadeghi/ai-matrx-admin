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

/** Is this conversation currently executing (in-flight or streaming)? */
export const selectIsExecuting =
  (conversationId: string) =>
  (state: RootState): boolean => {
    const status =
      state.executionInstances?.byConversationId[conversationId]?.status;
    return status === "running" || status === "streaming";
  };

/** Is this instance actively streaming a response? */
export const selectIsStreaming =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.executionInstances?.byConversationId[conversationId]?.status ===
    "streaming";

/** Is this instance paused waiting for client tool results? */
export const selectIsAwaitingTools =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.executionInstances?.byConversationId[conversationId]?.status ===
    "paused";

// =============================================================================
// Derived Request Selectors (conversationId → latest request data)
// =============================================================================

/**
 * The accumulated response text for the latest request on this instance.
 * Components only have conversationId — this bridges to the latest requestId.
 */
export const selectLatestAccumulatedText =
  (conversationId: string) =>
  (state: RootState): string => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
  (conversationId: string) =>
  (state: RootState): string | null => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
    if (ids.length > 0) {
      const latest = state.activeRequests?.byRequestId[ids[ids.length - 1]];
      if (latest?.serverConversationId) return latest.serverConversationId;
    }

    const turns =
      state.instanceConversationHistory?.byConversationId[conversationId]
        ?.turns;
    if (turns) {
      for (let i = turns.length - 1; i >= 0; i--) {
        const cid = turns[i].conversationId;
        if (cid) return cid;
      }
    }

    return null;
  };

/** The current conversation mode for this instance (agent | conversation | chat). */
export const selectConversationMode =
  (conversationId: string) => (state: RootState) =>
    state.instanceConversationHistory?.byConversationId[conversationId]?.mode ??
    "agent";

/**
 * The requestId for the most recent request on this instance.
 * A primitive — safe to use directly with useAppSelector.
 * Returns undefined (not null) so components can guard with `if (!requestId)`.
 */
export const selectLatestRequestId =
  (conversationId: string) =>
  (state: RootState): string | undefined => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
    return ids.length > 0 ? ids[ids.length - 1] : undefined;
  };

/**
 * The RequestStatus of the most recent request on this instance.
 * A primitive — safe to use directly with useAppSelector.
 * Returns undefined when no request exists yet.
 */
export const selectLatestRequestStatus =
  (conversationId: string) =>
  (state: RootState): RequestStatus | undefined => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
    if (ids.length === 0) return undefined;
    return state.activeRequests?.byRequestId[ids[ids.length - 1]]?.status;
  };

/**
 * Is the instance in the "connecting" sub-state?
 * True from HTTP send until the first chunk or error arrives.
 * Useful for showing a "waiting for response" skeleton before streaming begins.
 */
export const selectIsConnecting =
  (conversationId: string) =>
  (state: RootState): boolean => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
  (conversationId: string) =>
  (state: RootState): boolean => {
    const instanceStatus =
      state.executionInstances?.byConversationId[conversationId]?.status;
    // Running = request in flight but no chunks yet
    if (instanceStatus === "running") return true;

    // Also cover the "connecting" request status (before even the HTTP response)
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
  (conversationId: string) =>
  (state: RootState): string | undefined => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
  (conversationId: string) =>
  (state: RootState): string | undefined => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
export const selectPendingToolCallsForInstance = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests?.byConversationId[conversationId],
    (state: RootState) => state.activeRequests?.byRequestId,
    (requestIds, byRequestId): PendingToolCall[] | undefined => {
      if (!requestIds || requestIds.length === 0) return undefined;
      const latest = byRequestId[requestIds[requestIds.length - 1]];
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
  (conversationId: string) =>
  (state: RootState): boolean => {
    const userInput = state.instanceUserInput?.byConversationId[conversationId];
    const hasText = (userInput?.text?.trim().length ?? 0) > 0;
    if (hasText) return true;

    const resources = state.instanceResources?.byConversationId[conversationId];
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
  (conversationId: string) =>
  (state: RootState): { ready: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    const instance = state.executionInstances?.byConversationId[conversationId];

    if (!instance) {
      return { ready: false, reasons: ["Instance not found"] };
    }

    // Check resources
    const resources = state.instanceResources?.byConversationId[conversationId];
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
    const varEntry =
      state.instanceVariableValues?.byConversationId[conversationId];
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
  (conversationId: string) =>
  (state: RootState): AssembledAgentStartRequest | null =>
    assembleRequest(state, conversationId);

/**
 * Complete summary of an instance's current state.
 * Uses only instance-owned data — agentDefinition is never read here.
 * Memoized — only recomputes when any of the input slices change.
 */
export const selectInstanceSummary = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.executionInstances?.byConversationId[conversationId],
    (state: RootState) =>
      state.instanceModelOverrides?.byConversationId[conversationId],
    (state: RootState) =>
      state.instanceResources?.byConversationId[conversationId],
    (state: RootState) =>
      state.instanceContext?.byConversationId[conversationId],
    (state: RootState) =>
      state.instanceUserInput?.byConversationId[conversationId],
    (state: RootState) =>
      state.instanceUIState?.byConversationId[conversationId],
    (state: RootState) =>
      state.activeRequests?.byConversationId[conversationId],
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
        conversationId,
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
        displayMode: uiState?.displayMode ?? "direct",
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
  (conversationId: string) =>
  (state: RootState): boolean => {
    const definitions =
      state.instanceVariableValues?.byConversationId[conversationId]
        ?.definitions;
    if (!definitions || definitions.length === 0) return false;

    const turns =
      state.instanceConversationHistory?.byConversationId[conversationId]
        ?.turns;
    if (turns && turns.length > 0) return false;

    const status =
      state.executionInstances?.byConversationId[conversationId]?.status;
    if (status === "running" || status === "streaming") return false;

    return true;
  };

// =============================================================================
// Conversation → Instance Lookup
// =============================================================================

/**
 * Check if a conversationId exists in the execution system.
 *
 * Since conversationId IS now the key, this is a direct lookup.
 * Also checks active requests for server-confirmed conversation IDs
 * that may differ from the client-generated key.
 *
 * Returns the conversationId if found, or null.
 */
export const selectConversationExists =
  (conversationId: string) =>
  (state: RootState): string | null => {
    if (state.executionInstances?.byConversationId[conversationId]) {
      return conversationId;
    }

    const allIds = state.executionInstances?.allConversationIds ?? [];
    for (const cid of allIds) {
      const requestIds =
        state.activeRequests?.byConversationId[cid] ?? EMPTY_IDS;
      for (const requestId of requestIds) {
        const req = state.activeRequests?.byRequestId[requestId];
        if (req?.serverConversationId === conversationId) {
          return cid;
        }
      }
    }

    return null;
  };

/** @deprecated Use selectConversationExists */
export const selectInstanceIdByConversationId = selectConversationExists;

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
    (state: RootState, conversationId: string) =>
      state.instanceUIState?.byConversationId[conversationId],
    (state: RootState, conversationId: string) =>
      state.executionInstances?.byConversationId[conversationId],
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
 * All conversationIds that have an active execution (running, streaming, or
 * awaiting tools) grouped by their display mode.
 *
 * This is the primary input for an "ActiveAgentShell" component that needs
 * to know what to render and where — without scanning every instance.
 *
 * Memoized — only recomputes when the instance or UI state maps change.
 * Returns undefined (not {}) when there are no active instances.
 */
export const selectActiveInstancesByDisplayMode = createSelector(
  (state: RootState) => state.executionInstances?.byConversationId,
  (state: RootState) => state.instanceUIState?.byConversationId,
  (executionByConversationId, uiByConversationId) => {
    type DisplayModeMap = Record<string, string[]>;
    const result: DisplayModeMap = {};
    let hasAny = false;

    for (const cid of Object.keys(executionByConversationId)) {
      const instance = executionByConversationId[cid];
      if (!instance) continue;
      const { status } = instance;
      if (
        status !== "running" &&
        status !== "streaming" &&
        status !== "paused" &&
        status !== "complete"
      )
        continue;

      const mode = uiByConversationId[cid]?.displayMode;
      if (!mode) continue;

      if (!result[mode]) result[mode] = [];
      result[mode].push(cid);
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
  (state: RootState) => state.executionInstances?.byConversationId,
  (state: RootState) => state.instanceUIState?.byConversationId,
  (executionByConversationId, uiByConversationId) => {
    type DisplayModeMap = Record<string, string[]>;
    const result: DisplayModeMap = {};
    let hasAny = false;

    for (const cid of Object.keys(executionByConversationId)) {
      const instance = executionByConversationId[cid];
      if (!instance) continue;

      const { status } = instance;
      if (status === "draft") continue;

      const mode = uiByConversationId[cid]?.displayMode;
      if (!mode || mode === "direct" || mode === "background") continue;

      if (!result[mode]) result[mode] = [];
      result[mode].push(cid);
      hasAny = true;
    }

    return hasAny ? result : undefined;
  },
);

/**
 * All conversationIds that should be rendered as modals right now.
 * Combines: displayMode is modal-full or modal-compact AND status is past draft.
 * Memoized.
 */
export const selectActiveModalInstanceIds = createSelector(
  (state: RootState) => state.executionInstances?.byConversationId,
  (state: RootState) => state.instanceUIState?.byConversationId,
  (executionByConversationId, uiByConversationId): string[] | undefined => {
    const ids = Object.keys(executionByConversationId).filter((id) => {
      const status = executionByConversationId[id]?.status;
      if (status === "draft" || status === undefined) return false;
      const mode = uiByConversationId[id]?.displayMode;
      return mode === "modal-full" || mode === "modal-compact";
    });
    return ids.length > 0 ? ids : undefined;
  },
);

/**
 * All conversationIds that should be rendered as persistent panels or chat bubbles.
 * These stay mounted even when not actively streaming.
 * Memoized.
 */
export const selectActivePanelInstanceIds = createSelector(
  (state: RootState) => state.executionInstances?.byConversationId,
  (state: RootState) => state.instanceUIState?.byConversationId,
  (executionByConversationId, uiByConversationId): string[] | undefined => {
    const ids = Object.keys(executionByConversationId).filter((id) => {
      const status = executionByConversationId[id]?.status;
      if (status === "draft" || status === undefined) return false;
      const mode = uiByConversationId[id]?.displayMode;
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
  (conversationId: string) =>
  (state: RootState): Phase | null => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
  (conversationId: string) =>
  (state: RootState): string | null => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
export const selectLatestContentBlocks = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests?.byConversationId[conversationId],
    (state: RootState) => state.activeRequests?.byRequestId,
    (requestIds, byRequestId): ContentBlockPayload[] => {
      if (!requestIds || requestIds.length === 0) return [];
      const latest = byRequestId[requestIds[requestIds.length - 1]];
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
  (conversationId: string) =>
  (state: RootState): number => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
export const selectLatestActiveTools = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests?.byConversationId[conversationId],
    (state: RootState) => state.activeRequests?.byRequestId,
    (requestIds, byRequestId): ToolLifecycleEntry[] => {
      if (!requestIds || requestIds.length === 0) return [];
      const latest = byRequestId[requestIds[requestIds.length - 1]];
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
export const selectLatestToolLifecycles = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests?.byConversationId[conversationId],
    (state: RootState) => state.activeRequests?.byRequestId,
    (requestIds, byRequestId): ToolLifecycleEntry[] => {
      if (!requestIds || requestIds.length === 0) return [];
      const latest = byRequestId[requestIds[requestIds.length - 1]];
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
  (conversationId: string) =>
  (state: RootState): CompletionPayload | null => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
  (conversationId: string) =>
  (state: RootState): boolean => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
  (conversationId: string) =>
  (state: RootState): TimelineEntry[] | undefined => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
    if (ids.length === 0) return undefined;
    return state.activeRequests?.byRequestId[ids[ids.length - 1]]?.timeline;
  };

/**
 * Whether the latest request is currently inside a text-streaming run.
 * Useful to distinguish "actively receiving text" from "streaming but doing
 * non-text work" (tools, status updates, etc.).
 */
export const selectIsInTextRun =
  (conversationId: string) =>
  (state: RootState): boolean => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
    if (ids.length === 0) return false;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]?.isTextStreaming ??
      false
    );
  };

/** Whether reasoning tokens are currently streaming for the latest request. */
export const selectIsReasoningStreaming =
  (conversationId: string) =>
  (state: RootState): boolean => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
    if (ids.length === 0) return false;
    return (
      state.activeRequests?.byRequestId[ids[ids.length - 1]]
        ?.isReasoningStreaming ?? false
    );
  };

/** Accumulated reasoning text for the latest request. */
export const selectLatestAccumulatedReasoning =
  (conversationId: string) =>
  (state: RootState): string => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
    if (ids.length === 0) return "";
    const latest = state.activeRequests?.byRequestId[ids[ids.length - 1]];
    if (!latest) return "";
    if (latest.reasoningChunks.length > 0)
      return latest.reasoningChunks.join("");
    return latest.accumulatedReasoning || "";
  };

/** Record reservations for the latest request. */
export const selectLatestReservations =
  (conversationId: string) =>
  (
    state: RootState,
  ):
    | Record<
        string,
        import("@/features/agents/types/request.types").ReservationRecord
      >
    | undefined => {
    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
  (conversationId: string) =>
  (state: RootState): StreamPhase => {
    const instance = state.executionInstances?.byConversationId[conversationId];
    if (!instance) return "idle";

    const instanceStatus = instance.status;

    if (instanceStatus === "draft" || instanceStatus === "ready") return "idle";
    if (instanceStatus === "complete") return "complete";
    if (instanceStatus === "error") return "error";

    const ids =
      state.activeRequests?.byConversationId[conversationId] ?? EMPTY_IDS;
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
