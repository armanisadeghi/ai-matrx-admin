/**
 * Active Requests Slice
 *
 * Tracks everything that happens after an API call fires:
 * stream status, accumulated response, tool delegation, warnings,
 * and the sub-agent conversation tree.
 *
 * Keyed by requestId (not instanceId) because one instance can spawn
 * multiple requests via sub-agent conversations.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ActiveRequest,
  RequestStatus,
  PendingToolCall,
  StreamWarning,
} from "@/features/agents/types/request.types";
import { generateRequestId } from "../utils";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// State
// =============================================================================

export interface ActiveRequestsState {
  byRequestId: Record<string, ActiveRequest>;

  /** Map instanceId → requestIds for quick lookup */
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
    /**
     * Create a new request entry when an API call fires.
     */
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
        dataPayloads: [],
        pendingToolCalls: [],
        warnings: [],
        errorMessage: null,
        startedAt: now,
        firstChunkAt: null,
        completedAt: null,
      };

      if (!state.byInstanceId[instanceId]) {
        state.byInstanceId[instanceId] = [];
      }
      state.byInstanceId[instanceId].push(requestId);
    },

    /**
     * Update request status.
     */
    setRequestStatus(
      state,
      action: PayloadAction<{
        requestId: string;
        status: RequestStatus;
        errorMessage?: string;
      }>,
    ) {
      const { requestId, status, errorMessage } = action.payload;
      const request = state.byRequestId[requestId];
      if (request) {
        request.status = status;
        if (errorMessage) request.errorMessage = errorMessage;
        if (
          status === "complete" ||
          status === "error" ||
          status === "timeout"
        ) {
          request.completedAt = new Date().toISOString();
        }
      }
    },

    /**
     * Set the conversation ID (received from the server on first response).
     */
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

    /**
     * Append a text chunk from the stream.
     */
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

    /**
     * Append a structured data payload.
     */
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

    /**
     * Register a tool delegation event from the stream.
     * The AI loop is now suspended waiting for the client.
     */
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
        const deadline = new Date(now.getTime() + 120_000); // 120s timeout

        request.pendingToolCalls.push({
          ...toolCall,
          receivedAt: now.toISOString(),
          deadlineAt: deadline.toISOString(),
          resolved: false,
        });
        request.status = "awaiting-tools";
      }
    },

    /**
     * Mark a tool call as resolved (client submitted result).
     */
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

        // If all pending calls are resolved, resume streaming status
        const allResolved = request.pendingToolCalls.every((c) => c.resolved);
        if (allResolved && request.status === "awaiting-tools") {
          request.status = "streaming";
        }
      }
    },

    /**
     * Add a structured input warning.
     */
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

    /**
     * Remove a request entry.
     */
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
  appendDataPayload,
  addPendingToolCall,
  resolveToolCall,
  addWarning,
  removeRequest,
} = activeRequestsSlice.actions;

export default activeRequestsSlice.reducer;
