/**
 * Active Requests Slice
 *
 * Tracks everything that happens after an API call fires.
 * Each semantically distinct server event type gets its own dedicated
 * storage field — no untyped catch-all bags.
 *
 * Keyed by requestId (not instanceId) because one instance can spawn
 * multiple requests via multi-turn conversations.
 *
 * Storage map:
 *   chunk events       → accumulatedText (string concat)
 *   status_update      → currentStatus + statusHistory
 *   content_block      → contentBlocks (Record by blockId) + contentBlockOrder
 *   tool_event         → toolLifecycle (Record by callId) + pendingToolCalls
 *   completion         → completion (single object)
 *   error              → errorMessage + errorIsFatal + status change
 *   data               → dataPayloads (genuine catch-all, small)
 *   heartbeat          → dropped (no storage)
 *   end                → status change only
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ActiveRequest,
  RequestStatus,
  PendingToolCall,
  StreamWarning,
  ClientMetrics,
  ToolLifecycleEntry,
  ToolLifecycleStatus,
} from "@/features/agents/types/request.types";
import type {
  StatusUpdatePayload,
  ContentBlockPayload,
  CompletionPayload,
} from "@/types/python-generated/stream-events";
import { generateRequestId } from "../utils";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// State
// =============================================================================

export interface ActiveRequestsState {
  byRequestId: Record<string, ActiveRequest>;
  byInstanceId: Record<string, string[]>;
}

const initialState: ActiveRequestsState = {
  byRequestId: {},
  byInstanceId: {},
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
        instanceId: string;
        parentConversationId?: string | null;
      }>,
    ) {
      const {
        requestId = generateRequestId(),
        instanceId,
        parentConversationId = null,
      } = action.payload;

      const now = new Date().toISOString();

      state.byRequestId[requestId] = {
        requestId,
        instanceId,
        conversationId: null,
        parentConversationId,
        status: "pending",
        accumulatedText: "",
        currentStatus: null,
        statusHistory: [],
        contentBlocks: {},
        contentBlockOrder: [],
        toolLifecycle: {},
        pendingToolCalls: [],
        completion: null,
        errorMessage: null,
        errorIsFatal: false,
        warnings: [],
        dataPayloads: [],
        startedAt: now,
        firstChunkAt: null,
        completedAt: null,
        clientMetrics: null,
      };

      if (!state.byInstanceId[instanceId]) {
        state.byInstanceId[instanceId] = [];
      }
      state.byInstanceId[instanceId].push(requestId);
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
        request.conversationId = action.payload.conversationId;
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
        request.accumulatedText += action.payload.content;
        request.status = "streaming";
      }
    },

    // ── Status Updates ─────────────────────────────────────────

    setCurrentStatus(
      state,
      action: PayloadAction<{
        requestId: string;
        status: StatusUpdatePayload;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.currentStatus = action.payload.status;
        request.statusHistory.push(action.payload.status);
      }
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

    // ── Warnings ───────────────────────────────────────────────

    addWarning(
      state,
      action: PayloadAction<{
        requestId: string;
        warning: StreamWarning;
      }>,
    ) {
      const request = state.byRequestId[action.payload.requestId];
      if (request) {
        request.warnings.push(action.payload.warning);
      }
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

    // ── Cleanup ────────────────────────────────────────────────

    removeRequest(state, action: PayloadAction<string>) {
      const request = state.byRequestId[action.payload];
      if (request) {
        const instanceRequests = state.byInstanceId[request.instanceId];
        if (instanceRequests) {
          state.byInstanceId[request.instanceId] = instanceRequests.filter(
            (id) => id !== action.payload,
          );
          if (state.byInstanceId[request.instanceId].length === 0) {
            delete state.byInstanceId[request.instanceId];
          }
        }
        delete state.byRequestId[action.payload];
      }
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      const instanceId = action.payload;
      const requestIds = state.byInstanceId[instanceId] ?? [];
      for (const reqId of requestIds) {
        delete state.byRequestId[reqId];
      }
      delete state.byInstanceId[instanceId];
    });
  },
});

export const {
  createRequest,
  setRequestStatus,
  setConversationId,
  appendChunk,
  setCurrentStatus,
  upsertContentBlock,
  upsertToolLifecycle,
  addPendingToolCall,
  resolveToolCall,
  setCompletion,
  appendDataPayload,
  addWarning,
  finalizeClientMetrics,
  removeRequest,
} = activeRequestsSlice.actions;

export default activeRequestsSlice.reducer;
