/**
 * Active Requests Slice — V2 Event System
 *
 * Tracks everything that happens after an API call fires.
 * Each semantically distinct server event type gets its own dedicated
 * storage field — no untyped catch-all bags.
 *
 * V2 Storage map:
 *   chunk              → textChunks (O(1) push) + lazy join in selectors
 *   reasoning_chunk    → reasoningChunks (same pattern)
 *   phase              → currentPhase + phaseHistory
 *   init               → activeOperations (keyed by operation_id)
 *   completion         → completedOperations + completion (user_request)
 *   content_block      → contentBlocks (Record by blockId) + contentBlockOrder
 *   tool_event         → toolLifecycle (Record by callId) + pendingToolCalls
 *   data (typed)       → dataPayloads (typed, with `type` discriminator)
 *   warning            → warnings
 *   info               → infoEvents
 *   record_reserved    → reservations
 *   record_update      → reservations (status update)
 *   error              → errorMessage + errorIsFatal + status change
 *   heartbeat          → dropped (no storage)
 *   end                → status change only
 *   broker             → dataPayloads (frozen — no new usage)
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ActiveRequest,
  RequestStatus,
  PendingToolCall,
  ClientMetrics,
  ToolLifecycleEntry,
  ToolLifecycleStatus,
  TimelineEntry,
  RawStreamEvent,
  ReservationRecord,
  ReservationStatus,
} from "@/features/agents/types/request.types";
import type {
  Phase,
  Operation,
  InitCompletionStatus,
  ContentBlockPayload,
  CompletionPayload,
  WarningPayload,
  InfoPayload,
} from "@/types/python-generated/stream-events";
import { generateRequestId } from "../utils";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// State
// =============================================================================

export interface ActiveRequestsState {
  byRequestId: Record<string, ActiveRequest>;
  byConversationId: Record<string, string[]>;
}

const initialState: ActiveRequestsState = {
  byRequestId: {},
  byConversationId: {},
};

// =============================================================================
// Slice
// =============================================================================

const activeRequestsSlice = createSlice({
  name: "activeRequests",
  initialState,
  reducers: {
    createRequest(
      state,
      action: PayloadAction<{
        requestId?: string;
        conversationId: string;
        parentConversationId?: string | null;
      }>,
    ) {
      const {
        requestId = generateRequestId(),
        conversationId,
        parentConversationId = null,
      } = action.payload;

      const now = new Date().toISOString();

      state.byRequestId[requestId] = {
        requestId,
        conversationId,
        serverConversationId: null,
        parentConversationId,
        status: "pending",
        textChunks: [],
        accumulatedText: "",
        reasoningChunks: [],
        accumulatedReasoning: "",
        isReasoningStreaming: false,
        reasoningRunChunkStart: 0,
        currentPhase: null,
        phaseHistory: [],
        activeOperations: {},
        completedOperations: {},
        contentBlocks: {},
        contentBlockOrder: [],
        toolLifecycle: {},
        pendingToolCalls: [],
        completion: null,
        errorMessage: null,
        errorIsFatal: false,
        warnings: [],
        infoEvents: [],
        reservations: {},
        dataPayloads: [],
        timeline: [],
        rawEvents: [],
        isTextStreaming: false,
        textRunChunkStart: 0,
        extractedJson: null,
        jsonExtractionRevision: 0,
        jsonExtractionComplete: false,
        startedAt: now,
        firstChunkAt: null,
        completedAt: null,
        clientMetrics: null,
      };

      if (!state.byConversationId[conversationId]) {
        state.byConversationId[conversationId] = [];
      }
      state.byConversationId[conversationId].push(requestId);
    },

    setRequestStatus(
      state,
      action: PayloadAction<{
        requestId: string;
        status: RequestStatus;
        errorMessage?: string;
        isFatal?: boolean;
      }>,
    ) {
      const { requestId, status, errorMessage, isFatal } = action.payload;
      const request = state.byRequestId[requestId];
      if (request) {
        request.status = status;
        if (errorMessage !== undefined) request.errorMessage = errorMessage;
        if (isFatal !== undefined) request.errorIsFatal = isFatal;
        if (
          status === "complete" ||
          status === "error" ||
          status === "timeout"
        ) {
          request.completedAt = new Date().toISOString();
        }
      }
    },

    setConversationId(
      state,
      action: PayloadAction<{
        requestId: string;
        conversationId: string;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.serverConversationId = action.payload.conversationId;
      }
    },

    // ── Chunks ─────────────────────────────────────────────────

    appendChunk(
      state,
      action: PayloadAction<{ requestId: string; content: string }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        if (!request.firstChunkAt) {
          request.firstChunkAt = new Date().toISOString();
        }
        // O(1) push — lazy join in selectors avoids O(n) concat per chunk
        request.textChunks.push(action.payload.content);
      }
    },

    /**
     * Joins textChunks into accumulatedText. Call once after the stream ends
     * so that commitAssistantTurn reads the final string without a selector.
     */
    finalizeAccumulatedText(
      state,
      action: PayloadAction<{ requestId: string }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request && request.textChunks.length > 0) {
        request.accumulatedText = request.textChunks.join("");
      }
    },

    // ── Reasoning Chunks ─────────────────────────────────────────

    appendReasoningChunk(
      state,
      action: PayloadAction<{ requestId: string; content: string }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.reasoningChunks.push(action.payload.content);
      }
    },

    finalizeAccumulatedReasoning(
      state,
      action: PayloadAction<{ requestId: string }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request && request.reasoningChunks.length > 0) {
        request.accumulatedReasoning = request.reasoningChunks.join("");
      }
    },

    markReasoningStreamStart(
      state,
      action: PayloadAction<{ requestId: string; timestamp: number }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request) return;

      request.isReasoningStreaming = true;
      request.reasoningRunChunkStart = request.reasoningChunks.length;

      request.timeline.push({
        kind: "reasoning_start",
        seq: request.timeline.length,
        timestamp: action.payload.timestamp,
        chunkStartIndex: request.reasoningChunks.length,
      });
    },

    closeReasoningRun(
      state,
      action: PayloadAction<{ requestId: string; timestamp: number }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request || !request.isReasoningStreaming) return;

      request.timeline.push({
        kind: "reasoning_end",
        seq: request.timeline.length,
        timestamp: action.payload.timestamp,
        chunkStartIndex: request.reasoningRunChunkStart,
        chunkEndIndex: request.reasoningChunks.length,
        chunkCount:
          request.reasoningChunks.length - request.reasoningRunChunkStart,
      });
      request.isReasoningStreaming = false;
    },

    // ── Phase (replaces status_update) ──────────────────────────

    setCurrentPhase(
      state,
      action: PayloadAction<{
        requestId: string;
        phase: Phase;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.currentPhase = action.payload.phase;
        request.phaseHistory.push(action.payload.phase);
      }
    },

    // ── Operation Tracking (init/completion pairs) ────────────

    trackOperationInit(
      state,
      action: PayloadAction<{
        requestId: string;
        operationId: string;
        operation: Operation;
        parentOperationId?: string | null;
        timestamp: number;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request) return;

      request.activeOperations[action.payload.operationId] = {
        operationId: action.payload.operationId,
        operation: action.payload.operation,
        parentOperationId: action.payload.parentOperationId ?? null,
        startedAt: action.payload.timestamp,
      };
    },

    trackOperationCompletion(
      state,
      action: PayloadAction<{
        requestId: string;
        operationId: string;
        operation: Operation;
        status: InitCompletionStatus;
        result: Record<string, unknown>;
        timestamp: number;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request) return;

      const active = request.activeOperations[action.payload.operationId];
      const startedAt = active?.startedAt ?? action.payload.timestamp;

      request.completedOperations[action.payload.operationId] = {
        operationId: action.payload.operationId,
        operation: action.payload.operation,
        parentOperationId: active?.parentOperationId ?? null,
        startedAt,
        status: action.payload.status,
        result: action.payload.result,
        completedAt: action.payload.timestamp,
        durationMs: action.payload.timestamp - startedAt,
      };

      delete request.activeOperations[action.payload.operationId];
    },

    // ── Content Blocks ─────────────────────────────────────────

    upsertContentBlock(
      state,
      action: PayloadAction<{
        requestId: string;
        block: ContentBlockPayload;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request) return;

      const { block } = action.payload;
      const isNew = !(block.blockId in request.contentBlocks);

      request.contentBlocks[block.blockId] = block;

      if (isNew) {
        request.contentBlockOrder.push(block.blockId);
      }
    },

    // ── Tool Lifecycle ─────────────────────────────────────────

    upsertToolLifecycle(
      state,
      action: PayloadAction<{
        requestId: string;
        callId: string;
        toolName: string;
        status: ToolLifecycleStatus;
        arguments?: Record<string, unknown>;
        message?: string | null;
        data?: Record<string, unknown> | null;
        result?: unknown;
        resultPreview?: string | null;
        errorType?: string | null;
        errorMessage?: string | null;
        isDelegated?: boolean;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request) return;

      const {
        callId,
        toolName,
        status,
        message,
        data,
        result,
        resultPreview,
        errorType,
        errorMessage: toolError,
        isDelegated,
      } = action.payload;
      const args = action.payload.arguments;

      const existing = request.toolLifecycle[callId];
      const now = new Date().toISOString();

      if (existing) {
        existing.status = status;
        if (message !== undefined) existing.latestMessage = message ?? null;
        if (data !== undefined) existing.latestData = data ?? null;
        if (result !== undefined) existing.result = result;
        if (resultPreview !== undefined)
          existing.resultPreview = resultPreview ?? null;
        if (errorType !== undefined) existing.errorType = errorType ?? null;
        if (toolError !== undefined) existing.errorMessage = toolError ?? null;
        if (isDelegated !== undefined) existing.isDelegated = isDelegated;
        if (status === "completed" || status === "error") {
          existing.completedAt = now;
        }
      } else {
        request.toolLifecycle[callId] = {
          callId,
          toolName,
          status,
          arguments: args ?? {},
          startedAt: now,
          completedAt:
            status === "completed" || status === "error" ? now : null,
          latestMessage: message ?? null,
          latestData: data ?? null,
          result: result ?? null,
          resultPreview: resultPreview ?? null,
          errorType: errorType ?? null,
          errorMessage: toolError ?? null,
          isDelegated: isDelegated ?? false,
        };
      }
    },

    addPendingToolCall(
      state,
      action: PayloadAction<{
        requestId: string;
        toolCall: Omit<
          PendingToolCall,
          "receivedAt" | "deadlineAt" | "resolved"
        >;
      }>,
    ) {
      const { requestId, toolCall } = action.payload;
      const request = state.byRequestId[requestId];
      if (request) {
        const now = new Date();
        const deadline = new Date(now.getTime() + 120_000);

        request.pendingToolCalls.push({
          ...toolCall,
          receivedAt: now.toISOString(),
          deadlineAt: deadline.toISOString(),
          resolved: false,
        });
        request.status = "awaiting-tools";
      }
    },

    resolveToolCall(
      state,
      action: PayloadAction<{ requestId: string; callId: string }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        const call = request.pendingToolCalls.find(
          (c) => c.callId === action.payload.callId,
        );
        if (call) {
          call.resolved = true;
        }

        const allResolved = request.pendingToolCalls.every((c) => c.resolved);
        if (allResolved && request.status === "awaiting-tools") {
          request.status = "streaming";
        }
      }
    },

    // ── Completion ─────────────────────────────────────────────

    setCompletion(
      state,
      action: PayloadAction<{
        requestId: string;
        data: CompletionPayload;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.completion = action.payload.data;
      }
    },

    // ── Data Events (genuine catch-all) ────────────────────────

    appendDataPayload(
      state,
      action: PayloadAction<{
        requestId: string;
        data: Record<string, unknown>;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.dataPayloads.push(action.payload.data);
      }
    },

    // ── Warnings & Info ────────────────────────────────────────

    addWarning(
      state,
      action: PayloadAction<{
        requestId: string;
        warning: WarningPayload;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.warnings.push(action.payload.warning);
      }
    },

    addInfoEvent(
      state,
      action: PayloadAction<{
        requestId: string;
        info: InfoPayload;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.infoEvents.push(action.payload.info);
      }
    },

    // ── Record Reservations ──────────────────────────────────────

    upsertReservation(
      state,
      action: PayloadAction<{
        requestId: string;
        recordId: string;
        dbProject: string;
        table: string;
        status: ReservationStatus;
        parentRefs?: Record<string, string>;
        metadata?: Record<string, unknown>;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request) return;

      const { recordId, dbProject, table, status, parentRefs, metadata } =
        action.payload;

      const existing = request.reservations[recordId];
      if (existing) {
        existing.status = status;
        if (metadata) Object.assign(existing.metadata, metadata);
      } else {
        request.reservations[recordId] = {
          dbProject,
          table,
          recordId,
          status,
          parentRefs: parentRefs ?? {},
          metadata: metadata ?? {},
        };
      }
    },

    // ── Event Timeline ──────────────────────────────────────────

    /**
     * Append a non-chunk event to the timeline.
     * If text is currently streaming, automatically closes the text run first.
     */
    appendTimeline(
      state,
      action: PayloadAction<{
        requestId: string;
        entry: TimelineEntry;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request) return;

      if (request.isTextStreaming) {
        request.timeline.push({
          kind: "text_end",
          seq: request.timeline.length,
          timestamp: action.payload.entry.timestamp,
          chunkStartIndex: request.textRunChunkStart,
          chunkEndIndex: request.textChunks.length,
          chunkCount: request.textChunks.length - request.textRunChunkStart,
        });
        request.isTextStreaming = false;
      }

      if (request.isReasoningStreaming) {
        request.timeline.push({
          kind: "reasoning_end",
          seq: request.timeline.length,
          timestamp: action.payload.entry.timestamp,
          chunkStartIndex: request.reasoningRunChunkStart,
          chunkEndIndex: request.reasoningChunks.length,
          chunkCount:
            request.reasoningChunks.length - request.reasoningRunChunkStart,
        });
        request.isReasoningStreaming = false;
      }

      const entry = { ...action.payload.entry, seq: request.timeline.length };
      request.timeline.push(entry);
    },

    /**
     * Captures every raw event exactly as received from the NDJSON parser.
     * No filtering, no coalescing — the forensic truth.
     */
    appendRawEvent(
      state,
      action: PayloadAction<{
        requestId: string;
        event: RawStreamEvent;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request) return;
      request.rawEvents.push(action.payload.event);
    },

    /**
     * Called when the first chunk of a new text run arrives.
     * Records a `text_start` marker. Subsequent chunks just push to textChunks.
     */
    markTextStreamStart(
      state,
      action: PayloadAction<{
        requestId: string;
        timestamp: number;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request) return;

      request.isTextStreaming = true;
      request.textRunChunkStart = request.textChunks.length;

      request.timeline.push({
        kind: "text_start",
        seq: request.timeline.length,
        timestamp: action.payload.timestamp,
        chunkStartIndex: request.textChunks.length,
      });
    },

    /**
     * Explicitly close an open text run (e.g., at stream end).
     * No-op if text is not currently streaming.
     */
    closeTextRun(
      state,
      action: PayloadAction<{
        requestId: string;
        timestamp: number;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (!request || !request.isTextStreaming) return;

      request.timeline.push({
        kind: "text_end",
        seq: request.timeline.length,
        timestamp: action.payload.timestamp,
        chunkStartIndex: request.textRunChunkStart,
        chunkEndIndex: request.textChunks.length,
        chunkCount: request.textChunks.length - request.textRunChunkStart,
      });
      request.isTextStreaming = false;
    },

    // ── Client Metrics ─────────────────────────────────────────

    finalizeClientMetrics(
      state,
      action: PayloadAction<{ requestId: string; metrics: ClientMetrics }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.clientMetrics = action.payload.metrics;
      }
    },

    // ── JSON Extraction ─────────────────────────────────────────

    updateExtractedJson(
      state,
      action: PayloadAction<{
        requestId: string;
        results: ActiveRequest["extractedJson"];
        revision: number;
        isComplete: boolean;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.extractedJson = action.payload.results;
        request.jsonExtractionRevision = action.payload.revision;
        request.jsonExtractionComplete = action.payload.isComplete;
      }
    },

    // ── Cleanup ────────────────────────────────────────────────

    removeRequest(state, action: PayloadAction<string>) {
      const request = state.byRequestId[action.payload];
      if (request) {
        const conversationRequests =
          state.byConversationId[request.conversationId];
        if (conversationRequests) {
          state.byConversationId[request.conversationId] =
            conversationRequests.filter((id) => id !== action.payload);
          if (state.byConversationId[request.conversationId].length === 0) {
            delete state.byConversationId[request.conversationId];
          }
        }
        delete state.byRequestId[action.payload];
      }
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      const conversationId = action.payload;
      const requestIds = state.byConversationId[conversationId] ?? [];
      for (const reqId of requestIds) {
        delete state.byRequestId[reqId];
      }
      delete state.byConversationId[conversationId];
    });
  },
});

export const {
  createRequest,
  setRequestStatus,
  setConversationId,
  appendChunk,
  finalizeAccumulatedText,
  appendReasoningChunk,
  finalizeAccumulatedReasoning,
  markReasoningStreamStart,
  closeReasoningRun,
  setCurrentPhase,
  trackOperationInit,
  trackOperationCompletion,
  upsertContentBlock,
  upsertToolLifecycle,
  addPendingToolCall,
  resolveToolCall,
  setCompletion,
  appendDataPayload,
  addWarning,
  addInfoEvent,
  upsertReservation,
  appendTimeline,
  appendRawEvent,
  markTextStreamStart,
  closeTextRun,
  finalizeClientMetrics,
  updateExtractedJson,
  removeRequest,
} = activeRequestsSlice.actions;

export default activeRequestsSlice.reducer;
