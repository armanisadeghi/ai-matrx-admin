/**
 * Active Request Selectors
 *
 * SELECTOR RULES (same as aggregate.selectors.ts):
 * - Primitives returned directly — stable by value, safe for useAppSelector.
 * - Arrays/objects from .filter()/.map() ALWAYS wrapped in createSelector.
 * - Input selectors: plain state lookups only.
 * - Result functions: all filtering, mapping, and derivation.
 */

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  ActiveRequest,
  ToolLifecycleEntry,
  TimelineEntry,
} from "@/features/agents/types/request.types";
import type {
  StatusUpdatePayload,
  ContentBlockPayload,
  CompletionPayload,
} from "@/types/python-generated/stream-events";

// =============================================================================
// Core Request Selectors
// =============================================================================

export const selectRequest =
  (requestId: string) =>
  (state: RootState): ActiveRequest | undefined =>
    state.activeRequests.byRequestId[requestId];

export const selectRequestsForInstance =
  (instanceId: string) =>
  (state: RootState): ActiveRequest[] => {
    const ids = state.activeRequests.byInstanceId[instanceId] ?? [];
    return ids
      .map((id) => state.activeRequests.byRequestId[id])
      .filter((r): r is ActiveRequest => r != null);
  };

export const selectPrimaryRequest =
  (instanceId: string) =>
  (state: RootState): ActiveRequest | undefined => {
    const ids = state.activeRequests.byInstanceId[instanceId] ?? [];
    if (ids.length === 0) return undefined;
    return state.activeRequests.byRequestId[ids[ids.length - 1]];
  };

export const selectRequestStatus = (requestId: string) => (state: RootState) =>
  state.activeRequests.byRequestId[requestId]?.status;

export const selectAccumulatedText =
  (requestId: string) =>
  (state: RootState): string => {
    const request = state.activeRequests.byRequestId[requestId];
    if (!request) return "";
    if (request.textChunks.length > 0) return request.textChunks.join("");
    return request.accumulatedText || "";
  };

export const selectRequestConversationId =
  (requestId: string) =>
  (state: RootState): string | null =>
    state.activeRequests.byRequestId[requestId]?.conversationId ?? null;

export const selectHasActiveRequests = (state: RootState): boolean =>
  Object.values(state.activeRequests.byRequestId).some(
    (r) =>
      r.status === "pending" ||
      r.status === "connecting" ||
      r.status === "streaming" ||
      r.status === "awaiting-tools",
  );

// =============================================================================
// Status Update Selectors
// =============================================================================

/** The most recent status update for a request. Primitive — safe for useAppSelector. */
export const selectCurrentStatus =
  (requestId: string) =>
  (state: RootState): StatusUpdatePayload | null =>
    state.activeRequests.byRequestId[requestId]?.currentStatus ?? null;

/** Just the user-facing message from the latest status update. */
export const selectCurrentStatusMessage =
  (requestId: string) =>
  (state: RootState): string | null =>
    state.activeRequests.byRequestId[requestId]?.currentStatus?.user_message ??
    state.activeRequests.byRequestId[requestId]?.currentStatus?.status ??
    null;

/** Full status history — for timeline / debug views. Memoized. */
export const selectStatusHistory = (requestId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId],
    (request): StatusUpdatePayload[] => request?.statusHistory ?? [],
  );

// =============================================================================
// Content Block Selectors
// =============================================================================

/** A single content block by blockId. Primitive-ish — object ref stable until upserted. */
export const selectContentBlock =
  (requestId: string, blockId: string) =>
  (state: RootState): ContentBlockPayload | undefined =>
    state.activeRequests.byRequestId[requestId]?.contentBlocks[blockId];

/** Ordered blockIds for rendering. Stable array ref until a new block arrives. */
export const selectContentBlockOrder =
  (requestId: string) =>
  (state: RootState): string[] =>
    state.activeRequests.byRequestId[requestId]?.contentBlockOrder ?? [];

/** All content blocks in emission order. Memoized. */
export const selectAllContentBlocks = (requestId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId],
    (request): ContentBlockPayload[] => {
      if (!request) return [];
      return request.contentBlockOrder
        .map((id) => request.contentBlocks[id])
        .filter((b): b is ContentBlockPayload => b != null);
    },
  );

/** Content blocks filtered by type (e.g., "code", "flashcards"). Memoized. */
export const selectContentBlocksByType = (requestId: string, type: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId],
    (request): ContentBlockPayload[] => {
      if (!request) return [];
      return request.contentBlockOrder
        .map((id) => request.contentBlocks[id])
        .filter((b): b is ContentBlockPayload => b != null && b.type === type);
    },
  );

/** Blocks still streaming. Memoized. */
export const selectStreamingBlocks = (requestId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId],
    (request): ContentBlockPayload[] => {
      if (!request) return [];
      return request.contentBlockOrder
        .map((id) => request.contentBlocks[id])
        .filter(
          (b): b is ContentBlockPayload =>
            b != null && b.status === "streaming",
        );
    },
  );

/** Blocks that are complete. Memoized. */
export const selectCompletedBlocks = (requestId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId],
    (request): ContentBlockPayload[] => {
      if (!request) return [];
      return request.contentBlockOrder
        .map((id) => request.contentBlocks[id])
        .filter(
          (b): b is ContentBlockPayload => b != null && b.status === "complete",
        );
    },
  );

/** How many content blocks exist for this request. Primitive. */
export const selectContentBlockCount =
  (requestId: string) =>
  (state: RootState): number =>
    state.activeRequests.byRequestId[requestId]?.contentBlockOrder.length ?? 0;

// =============================================================================
// Tool Lifecycle Selectors
// =============================================================================

/** A single tool lifecycle entry by callId. */
export const selectToolLifecycle =
  (requestId: string, callId: string) =>
  (state: RootState): ToolLifecycleEntry | undefined =>
    state.activeRequests.byRequestId[requestId]?.toolLifecycle[callId];

/** All tool lifecycle entries. Memoized. */
export const selectAllToolLifecycles = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.toolLifecycle,
    (lifecycle): ToolLifecycleEntry[] =>
      lifecycle ? Object.values(lifecycle) : [],
  );

/** Tools that are actively running (started, progress, step). Memoized. */
export const selectActiveTools = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.toolLifecycle,
    (lifecycle): ToolLifecycleEntry[] => {
      if (!lifecycle) return [];
      return Object.values(lifecycle).filter(
        (t) =>
          t.status === "started" ||
          t.status === "progress" ||
          t.status === "step",
      );
    },
  );

/** Tools that completed successfully. Memoized. */
export const selectCompletedTools = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.toolLifecycle,
    (lifecycle): ToolLifecycleEntry[] => {
      if (!lifecycle) return [];
      return Object.values(lifecycle).filter((t) => t.status === "completed");
    },
  );

/** Tools that errored. Memoized. */
export const selectToolErrors = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.toolLifecycle,
    (lifecycle): ToolLifecycleEntry[] => {
      if (!lifecycle) return [];
      return Object.values(lifecycle).filter((t) => t.status === "error");
    },
  );

/** How many tools are currently active. Primitive. */
export const selectActiveToolCount =
  (requestId: string) =>
  (state: RootState): number => {
    const lifecycle =
      state.activeRequests.byRequestId[requestId]?.toolLifecycle;
    if (!lifecycle) return 0;
    return Object.values(lifecycle).filter(
      (t) =>
        t.status === "started" ||
        t.status === "progress" ||
        t.status === "step",
    ).length;
  };

/** Pending tool calls that haven't been resolved yet. */
export const selectUnresolvedToolCalls =
  (requestId: string) => (state: RootState) => {
    const request = state.activeRequests.byRequestId[requestId];
    if (!request) return [];
    return request.pendingToolCalls.filter((c) => !c.resolved);
  };

// =============================================================================
// Completion Selectors
// =============================================================================

/** The completion payload for a request. null until completion event fires. */
export const selectCompletion =
  (requestId: string) =>
  (state: RootState): CompletionPayload | null =>
    state.activeRequests.byRequestId[requestId]?.completion ?? null;

// =============================================================================
// Error Selectors
// =============================================================================

/** Whether the error on this request was fatal. */
export const selectErrorIsFatal =
  (requestId: string) =>
  (state: RootState): boolean =>
    state.activeRequests.byRequestId[requestId]?.errorIsFatal ?? false;

// =============================================================================
// Conversation Tree
// =============================================================================

export const selectConversationTree =
  (instanceId: string) =>
  (
    state: RootState,
  ): {
    root: ActiveRequest | null;
    children: Record<string, ActiveRequest[]>;
  } => {
    const requests = (state.activeRequests.byInstanceId[instanceId] ?? [])
      .map((id) => state.activeRequests.byRequestId[id])
      .filter((r): r is ActiveRequest => r != null);

    const root = requests.find((r) => r.parentConversationId === null) ?? null;
    const children: Record<string, ActiveRequest[]> = {};

    for (const req of requests) {
      if (req.parentConversationId) {
        if (!children[req.parentConversationId]) {
          children[req.parentConversationId] = [];
        }
        children[req.parentConversationId].push(req);
      }
    }

    return { root, children };
  };

// =============================================================================
// Timeline Selectors
// =============================================================================

/** The full timeline for a request. Stable ref — only grows. */
export const selectTimeline =
  (requestId: string) =>
  (state: RootState): TimelineEntry[] =>
    state.activeRequests.byRequestId[requestId]?.timeline ?? [];

/** Timeline length. Primitive — safe for useAppSelector. */
export const selectTimelineLength =
  (requestId: string) =>
  (state: RootState): number =>
    state.activeRequests.byRequestId[requestId]?.timeline.length ?? 0;

/** Whether text is currently streaming (inside a text_start..text_end run). */
export const selectIsInTextRun =
  (requestId: string) =>
  (state: RootState): boolean =>
    state.activeRequests.byRequestId[requestId]?.isTextStreaming ?? false;

/** Timeline filtered to a specific kind. Memoized. */
export const selectTimelineByKind = (requestId: string, kind: TimelineEntry["kind"]) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId]?.timeline,
    (timeline): TimelineEntry[] => {
      if (!timeline) return [];
      return timeline.filter((e) => e.kind === kind);
    },
  );

/** Count of timeline entries by kind. Memoized. */
export const selectTimelineKindCounts = (requestId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId]?.timeline,
    (timeline): Record<string, number> => {
      const counts: Record<string, number> = {};
      if (!timeline) return counts;
      for (const entry of timeline) {
        counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
      }
      return counts;
    },
  );
