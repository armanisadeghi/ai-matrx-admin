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
  RawStreamEvent,
  ReservationRecord,
} from "@/features/agents/types/request.types";
import type {
  Phase,
  Operation,
  InitCompletionStatus,
  ContentBlockPayload,
  CompletionPayload,
  WarningPayload,
  InfoPayload,
  UserRequestResult,
  LlmRequestResult,
  ToolExecutionResult,
  SubAgentResult,
  PersistenceResult,
  TypedDataPayload,
  AudioOutputData,
  CategorizationResultData,
  ConversationIdData,
  ConversationLabeledData,
  FetchResultsData,
  FunctionResultData,
  ImageOutputData,
  PodcastCompleteData,
  PodcastStageData,
  QuestionnaireDisplayData,
  ScrapeBatchCompleteData,
  SearchErrorData,
  SearchResultsData,
  StructuredInputWarningData,
  VideoOutputData,
  WorkflowStepData,
} from "@/types/python-generated/stream-events";
import type {
  OperationEntry,
  CompletedOperationEntry,
} from "@/features/agents/types/request.types";

// =============================================================================
// Core Request Selectors
// =============================================================================

export const selectRequest =
  (requestId: string) =>
  (state: RootState): ActiveRequest | undefined =>
    state.activeRequests.byRequestId[requestId];

export const selectRequestsForInstance = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byInstanceId[instanceId],
    (state: RootState) => state.activeRequests.byRequestId,
    (ids, byRequestId): ActiveRequest[] => {
      if (!ids || ids.length === 0) return [];
      return ids
        .map((id) => byRequestId[id])
        .filter((r): r is ActiveRequest => r != null);
    },
  );

export const selectPrimaryRequest =
  (instanceId: string) =>
  (state: RootState): ActiveRequest | undefined => {
    const ids = state.activeRequests.byInstanceId[instanceId];
    if (!ids || ids.length === 0) return undefined;
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
// Phase Selectors (V2 — replaces status_update)
// =============================================================================

/** The most recent phase for a request. Primitive — safe for useAppSelector. */
export const selectCurrentPhase =
  (requestId: string) =>
  (state: RootState): Phase | null =>
    state.activeRequests.byRequestId[requestId]?.currentPhase ?? null;

/** Full phase history — for timeline / debug views. Memoized. */
export const selectPhaseHistory = (requestId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId],
    (request): Phase[] => request?.phaseHistory ?? [],
  );

// =============================================================================
// Operation Tracking Selectors (init/completion pairs)
// =============================================================================

/** All currently active (in-flight) operations. */
export const selectActiveOperations =
  (requestId: string) =>
  (state: RootState): Record<string, OperationEntry> | undefined =>
    state.activeRequests.byRequestId[requestId]?.activeOperations;

/** All completed operations. */
export const selectCompletedOperations =
  (requestId: string) =>
  (state: RootState): Record<string, CompletedOperationEntry> | undefined =>
    state.activeRequests.byRequestId[requestId]?.completedOperations;

/** Whether any operations are currently in-flight. Primitive. */
export const selectHasActiveOperations =
  (requestId: string) =>
  (state: RootState): boolean =>
    Object.keys(
      state.activeRequests.byRequestId[requestId]?.activeOperations ?? {},
    ).length > 0;

/** Completed operations filtered by operation type. Memoized. */
export const selectCompletedOperationsByType = (
  requestId: string,
  operation: Operation,
) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.completedOperations,
    (ops): CompletedOperationEntry[] => {
      if (!ops) return [];
      return Object.values(ops).filter((o) => o.operation === operation);
    },
  );

/** The user_request completion entry (the primary one). */
export const selectUserRequestCompletion =
  (requestId: string) =>
  (state: RootState): CompletedOperationEntry | undefined => {
    const ops =
      state.activeRequests.byRequestId[requestId]?.completedOperations;
    if (!ops) return undefined;
    return Object.values(ops).find((o) => o.operation === "user_request");
  };

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
  (state: RootState): string[] | undefined =>
    state.activeRequests.byRequestId[requestId]?.contentBlockOrder;

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

/** Pending tool calls that haven't been resolved yet. Memoized. */
export const selectUnresolvedToolCalls = (requestId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId],
    (request) => {
      if (!request) return undefined;
      return request.pendingToolCalls.filter((c) => !c.resolved);
    },
  );

// =============================================================================
// Completion Selectors
// =============================================================================

/** The completion payload for a request. null until completion event fires. */
export const selectCompletion =
  (requestId: string) =>
  (state: RootState): CompletionPayload | null =>
    state.activeRequests.byRequestId[requestId]?.completion ?? null;

// =============================================================================
// Typed Completion Result Selectors
//
// Each operation type has a known result shape from the auto-generated types.
// These selectors narrow the untyped Record<string, unknown> to the correct
// interface so components never need to cast.
// =============================================================================

type OperationResultMap = {
  user_request: UserRequestResult;
  llm_request: LlmRequestResult;
  tool_execution: ToolExecutionResult;
  sub_agent: SubAgentResult;
  persistence: PersistenceResult;
};

function getTypedResult<T extends Operation>(
  ops: Record<string, CompletedOperationEntry> | undefined,
  operation: T,
): OperationResultMap[T] | undefined {
  if (!ops) return undefined;
  const entry = Object.values(ops).find((o) => o.operation === operation);
  return entry?.result as OperationResultMap[T] | undefined;
}

function getAllTypedResults<T extends Operation>(
  ops: Record<string, CompletedOperationEntry> | undefined,
  operation: T,
): OperationResultMap[T][] {
  if (!ops) return [];
  return Object.values(ops)
    .filter((o) => o.operation === operation)
    .map((o) => o.result as OperationResultMap[T]);
}

/** The user_request result with full usage, timing, and tool call stats. */
export const selectUserRequestResult =
  (requestId: string) =>
  (state: RootState): UserRequestResult | undefined =>
    getTypedResult(
      state.activeRequests.byRequestId[requestId]?.completedOperations,
      "user_request",
    );

/** All LLM request results (one per iteration). */
export const selectLlmRequestResults = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.completedOperations,
    (ops): LlmRequestResult[] => getAllTypedResults(ops, "llm_request"),
  );

/** All tool execution results. */
export const selectToolExecutionResults = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.completedOperations,
    (ops): ToolExecutionResult[] => getAllTypedResults(ops, "tool_execution"),
  );

/** All sub-agent results. */
export const selectSubAgentResults = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.completedOperations,
    (ops): SubAgentResult[] => getAllTypedResults(ops, "sub_agent"),
  );

/** All persistence results. */
export const selectPersistenceResults = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.completedOperations,
    (ops): PersistenceResult[] => getAllTypedResults(ops, "persistence"),
  );

// =============================================================================
// Typed Data Payload Selectors
//
// Data events carry a `type` discriminator. These selectors narrow the
// untyped dataPayloads array to the correct TypedDataPayload interface.
// =============================================================================

type DataTypeMap = {
  audio_output: AudioOutputData;
  categorization_result: CategorizationResultData;
  conversation_id: ConversationIdData;
  conversation_labeled: ConversationLabeledData;
  display_questionnaire: QuestionnaireDisplayData;
  fetch_results: FetchResultsData;
  function_result: FunctionResultData;
  image_output: ImageOutputData;
  podcast_complete: PodcastCompleteData;
  podcast_stage: PodcastStageData;
  scrape_batch_complete: ScrapeBatchCompleteData;
  search_error: SearchErrorData;
  search_results: SearchResultsData;
  structured_input_warning: StructuredInputWarningData;
  video_output: VideoOutputData;
  workflow_step: WorkflowStepData;
};

type DataTypeName = keyof DataTypeMap;

/**
 * Generic typed data selector factory. Returns all data payloads matching
 * the given type discriminator, narrowed to the correct interface.
 *
 * Usage: const results = useAppSelector(selectTypedDataPayloads(requestId, "search_results"));
 *        // results is SearchResultsData[]
 */
export const selectTypedDataPayloads = <T extends DataTypeName>(
  requestId: string,
  dataType: T,
) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.dataPayloads,
    (payloads): DataTypeMap[T][] => {
      if (!payloads) return [];
      return payloads.filter(
        (p) => (p as Record<string, unknown>).type === dataType,
      ) as unknown as DataTypeMap[T][];
    },
  );

/** First data payload of the given type, or undefined. */
export const selectFirstTypedDataPayload =
  <T extends DataTypeName>(requestId: string, dataType: T) =>
  (state: RootState): DataTypeMap[T] | undefined => {
    const payloads = state.activeRequests.byRequestId[requestId]?.dataPayloads;
    if (!payloads) return undefined;
    return payloads.find(
      (p) => (p as Record<string, unknown>).type === dataType,
    ) as unknown as DataTypeMap[T] | undefined;
  };

/** All data payloads as a typed union. Memoized. */
export const selectAllTypedDataPayloads = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.dataPayloads,
    (payloads): TypedDataPayload[] => {
      if (!payloads) return [];
      return payloads.filter(
        (p) => typeof (p as Record<string, unknown>).type === "string",
      ) as TypedDataPayload[];
    },
  );

/** Distinct data types received for this request. Memoized. */
export const selectReceivedDataTypes = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.dataPayloads,
    (payloads): string[] => {
      if (!payloads) return [];
      const types = new Set<string>();
      for (const p of payloads) {
        const t = (p as Record<string, unknown>).type;
        if (typeof t === "string") types.add(t);
      }
      return Array.from(types);
    },
  );

// =============================================================================
// Reasoning Selectors
// =============================================================================

/** Accumulated reasoning text (joined lazily like text chunks). */
export const selectAccumulatedReasoning =
  (requestId: string) =>
  (state: RootState): string => {
    const request = state.activeRequests.byRequestId[requestId];
    if (!request) return "";
    if (request.reasoningChunks.length > 0)
      return request.reasoningChunks.join("");
    return request.accumulatedReasoning || "";
  };

/** Whether reasoning tokens are currently streaming. Primitive. */
export const selectIsReasoningStreaming =
  (requestId: string) =>
  (state: RootState): boolean =>
    state.activeRequests.byRequestId[requestId]?.isReasoningStreaming ?? false;

/** Whether any reasoning content exists for this request. Primitive. */
export const selectHasReasoning =
  (requestId: string) =>
  (state: RootState): boolean =>
    (state.activeRequests.byRequestId[requestId]?.reasoningChunks.length ?? 0) >
    0;

// =============================================================================
// Warning Selectors
// =============================================================================

/** All structured warnings for a request. Stable ref — only grows. */
export const selectWarnings =
  (requestId: string) =>
  (state: RootState): WarningPayload[] | undefined =>
    state.activeRequests.byRequestId[requestId]?.warnings;

/** Warning count. Primitive. */
export const selectWarningCount =
  (requestId: string) =>
  (state: RootState): number =>
    state.activeRequests.byRequestId[requestId]?.warnings.length ?? 0;

/** High-severity warnings only. Memoized. */
export const selectHighWarnings = (requestId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId]?.warnings,
    (warnings): WarningPayload[] => {
      if (!warnings) return [];
      return warnings.filter((w) => w.level === "high");
    },
  );

// =============================================================================
// Info Event Selectors
// =============================================================================

/** All info events for a request. Stable ref — only grows. */
export const selectInfoEvents =
  (requestId: string) =>
  (state: RootState): InfoPayload[] | undefined =>
    state.activeRequests.byRequestId[requestId]?.infoEvents;

// =============================================================================
// Record Reservation Selectors
// =============================================================================

/** All reservations for a request. Stable ref. */
export const selectReservations =
  (requestId: string) =>
  (state: RootState): Record<string, ReservationRecord> | undefined =>
    state.activeRequests.byRequestId[requestId]?.reservations;

/** A single reservation by record_id. */
export const selectReservation =
  (requestId: string, recordId: string) =>
  (state: RootState): ReservationRecord | undefined =>
    state.activeRequests.byRequestId[requestId]?.reservations[recordId];

/** Reservations filtered by table name. Memoized. */
export const selectReservationsByTable = (requestId: string, table: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.reservations,
    (reservations): ReservationRecord[] => {
      if (!reservations) return [];
      return Object.values(reservations).filter((r) => r.table === table);
    },
  );

/** Reservations still in pending status. Memoized. */
export const selectPendingReservations = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.reservations,
    (reservations): ReservationRecord[] => {
      if (!reservations) return [];
      return Object.values(reservations).filter((r) => r.status === "pending");
    },
  );

/** Reservations that have failed. Memoized. */
export const selectFailedReservations = (requestId: string) =>
  createSelector(
    (state: RootState) =>
      state.activeRequests.byRequestId[requestId]?.reservations,
    (reservations): ReservationRecord[] => {
      if (!reservations) return [];
      return Object.values(reservations).filter((r) => r.status === "failed");
    },
  );

/** Total count of reservations. Primitive. */
export const selectReservationCount =
  (requestId: string) =>
  (state: RootState): number =>
    Object.keys(state.activeRequests.byRequestId[requestId]?.reservations ?? {})
      .length;

/** The conversation_id from the cx_conversation reservation, if available. */
export const selectReservedConversationId =
  (requestId: string) =>
  (state: RootState): string | null => {
    const reservations =
      state.activeRequests.byRequestId[requestId]?.reservations;
    if (!reservations) return null;
    const conv = Object.values(reservations).find(
      (r) => r.table === "cx_conversation",
    );
    return conv?.recordId ?? null;
  };

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

export const selectConversationTree = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byInstanceId[instanceId],
    (state: RootState) => state.activeRequests.byRequestId,
    (
      ids,
      byRequestId,
    ): {
      root: ActiveRequest | null;
      children: Record<string, ActiveRequest[]>;
    } => {
      const requests = (ids ?? [])
        .map((id) => byRequestId[id])
        .filter((r): r is ActiveRequest => r != null);

      const root =
        requests.find((r) => r.parentConversationId === null) ?? null;
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
    },
  );

// =============================================================================
// Timeline Selectors
// =============================================================================

/** The full timeline for a request. Stable ref — only grows. */
export const selectTimeline =
  (requestId: string) =>
  (state: RootState): TimelineEntry[] | undefined =>
    state.activeRequests.byRequestId[requestId]?.timeline;

/** The raw event log — every event before processing. Stable ref — only grows. */
export const selectRawEvents =
  (requestId: string) =>
  (state: RootState): RawStreamEvent[] | undefined =>
    state.activeRequests.byRequestId[requestId]?.rawEvents;

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
export const selectTimelineByKind = (
  requestId: string,
  kind: TimelineEntry["kind"],
) =>
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

// =============================================================================
// Timeline-Derived Timing
// =============================================================================

export interface TimelineDerivedTiming {
  /** Delta from request start (timeline[0]) to first phase event */
  timeToFirstPhaseMs: number | null;
  /** Delta from request start to first text_start */
  timeToFirstTextMs: number | null;
  /** Delta from request start to first reasoning_start */
  timeToFirstReasoningMs: number | null;
  /** Delta from request start to first init event */
  timeToFirstInitMs: number | null;
  /** Sum of all text_start→text_end durations */
  textStreamingDurationMs: number;
  /** Sum of all reasoning_start→reasoning_end durations */
  reasoningStreamingDurationMs: number;
  /** Sum of all tool_started→tool_completed durations (by callId) */
  toolExecutionDurationMs: number;
  /** Total stream time minus text streaming time minus tool time */
  interstitialDurationMs: number | null;
  /** Total timeline span: last entry timestamp - first entry timestamp */
  totalTimelineDurationMs: number | null;
  /** Number of distinct text runs */
  textRunCount: number;
  /** Number of distinct reasoning runs */
  reasoningRunCount: number;
  /** Number of distinct tool calls tracked */
  toolCallCount: number;
  /** Number of record_reserved events */
  reservationCount: number;
  /** Number of warning events */
  warningCount: number;
  /** Number of info events */
  infoCount: number;
}

const EMPTY_TIMING: TimelineDerivedTiming = {
  timeToFirstPhaseMs: null,
  timeToFirstTextMs: null,
  timeToFirstReasoningMs: null,
  timeToFirstInitMs: null,
  textStreamingDurationMs: 0,
  reasoningStreamingDurationMs: 0,
  toolExecutionDurationMs: 0,
  interstitialDurationMs: null,
  totalTimelineDurationMs: null,
  textRunCount: 0,
  reasoningRunCount: 0,
  toolCallCount: 0,
  reservationCount: 0,
  warningCount: 0,
  infoCount: 0,
};

/**
 * Walk the timeline once and compute precise timing metrics.
 * Memoized — only recomputes when the timeline array ref changes.
 */
export const selectTimelineDerivedTiming = (requestId: string) =>
  createSelector(
    (state: RootState) => state.activeRequests.byRequestId[requestId]?.timeline,
    (timeline): TimelineDerivedTiming => {
      if (!timeline || timeline.length === 0) return EMPTY_TIMING;

      const origin = timeline[0].timestamp;
      let timeToFirstPhaseMs: number | null = null;
      let timeToFirstTextMs: number | null = null;
      let timeToFirstReasoningMs: number | null = null;
      let timeToFirstInitMs: number | null = null;
      let textStreamingDurationMs = 0;
      let reasoningStreamingDurationMs = 0;
      let textRunCount = 0;
      let reasoningRunCount = 0;

      let currentTextRunStart: number | null = null;
      let currentReasoningRunStart: number | null = null;

      const toolStarts = new Map<string, number>();
      let toolExecutionDurationMs = 0;
      let toolCallCount = 0;
      let reservationCount = 0;
      let warningCount = 0;
      let infoCount = 0;

      for (const entry of timeline) {
        switch (entry.kind) {
          case "phase":
            if (timeToFirstPhaseMs === null) {
              timeToFirstPhaseMs = entry.timestamp - origin;
            }
            break;

          case "init":
            if (timeToFirstInitMs === null) {
              timeToFirstInitMs = entry.timestamp - origin;
            }
            break;

          case "text_start":
            if (timeToFirstTextMs === null) {
              timeToFirstTextMs = entry.timestamp - origin;
            }
            currentTextRunStart = entry.timestamp;
            textRunCount++;
            break;

          case "text_end":
            if (currentTextRunStart !== null) {
              textStreamingDurationMs += entry.timestamp - currentTextRunStart;
              currentTextRunStart = null;
            }
            break;

          case "reasoning_start":
            if (timeToFirstReasoningMs === null) {
              timeToFirstReasoningMs = entry.timestamp - origin;
            }
            currentReasoningRunStart = entry.timestamp;
            reasoningRunCount++;
            break;

          case "reasoning_end":
            if (currentReasoningRunStart !== null) {
              reasoningStreamingDurationMs +=
                entry.timestamp - currentReasoningRunStart;
              currentReasoningRunStart = null;
            }
            break;

          case "tool_event":
            if (entry.subEvent === "tool_started") {
              toolStarts.set(entry.callId, entry.timestamp);
            } else if (
              entry.subEvent === "tool_completed" ||
              entry.subEvent === "tool_error"
            ) {
              const start = toolStarts.get(entry.callId);
              if (start !== undefined) {
                toolExecutionDurationMs += entry.timestamp - start;
                toolStarts.delete(entry.callId);
                toolCallCount++;
              }
            }
            break;

          case "record_reserved":
            reservationCount++;
            break;

          case "warning":
            warningCount++;
            break;

          case "info":
            infoCount++;
            break;
        }
      }

      const last = timeline[timeline.length - 1];
      const totalTimelineDurationMs = last.timestamp - origin;

      const interstitialDurationMs =
        totalTimelineDurationMs > 0
          ? totalTimelineDurationMs -
            textStreamingDurationMs -
            reasoningStreamingDurationMs -
            toolExecutionDurationMs
          : null;

      return {
        timeToFirstPhaseMs,
        timeToFirstTextMs,
        timeToFirstReasoningMs,
        timeToFirstInitMs,
        textStreamingDurationMs,
        reasoningStreamingDurationMs,
        toolExecutionDurationMs,
        interstitialDurationMs,
        totalTimelineDurationMs,
        textRunCount,
        reasoningRunCount,
        toolCallCount,
        reservationCount,
        warningCount,
        infoCount,
      };
    },
  );
