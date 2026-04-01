/**
 * Execute Instance Thunk
 *
 * THE critical thunk — the single place where all slices converge.
 * Reads across every layer to assemble the request payload, fires the API
 * call, and manages the NDJSON stream lifecycle.
 *
 * Routing logic (automatic, no call-site changes needed):
 *   - Turn 1 (no conversationId):  POST /api/ai/agents/{agentId}
 *   - Turn 2+ (conversationId exists): POST /api/ai/conversations/{conversationId}
 *
 * This thunk:
 *   1. Checks for existing conversationId to route to the correct endpoint
 *   2. Assembles the snake_case payload from instance slices + appContextSlice
 *   3. Adds auth headers from userSlice (Bearer token or X-Fingerprint-ID)
 *   4. Resolves the base URL from apiConfigSlice
 *   5. Reads conversation_id from X-Conversation-ID response header
 *   6. Processes the NDJSON stream using canonical stream-events types
 *   7. Appends completed turns to instanceConversationHistory
 *   8. Updates request status throughout
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { AssembledAgentStartRequest } from "@/features/agents/types/request.types";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";
import { generateRequestId } from "../utils";
import { setInstanceStatus } from "../execution-instances";
import { selectResourcePayloads } from "../instance-resources";
import { selectResolvedVariables } from "../instance-variable-values";
import { selectSettingsOverridesForApi } from "../instance-model-overrides";
import { selectContextPayload } from "../instance-context";
import { selectLatestConversationId } from "../selectors/aggregate.selectors";
import {
  selectOrganizationId,
  selectWorkspaceId,
  selectProjectId,
  selectTaskId,
} from "@/lib/redux/slices/appContextSlice";
import {
  selectAccessToken,
  selectFingerprintId,
} from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import {
  isChunkEvent,
  isToolEventEvent,
  isEndEvent,
  isErrorEvent,
  isStatusUpdateEvent,
  isDataEvent,
  isCompletionEvent,
  isContentBlockEvent,
  isHeartbeatEvent,
} from "@/types/python-generated/stream-events";
import {
  addPendingToolCall,
  appendChunk,
  appendDataPayload,
  createRequest,
  finalizeClientMetrics,
  setConversationId,
  setRequestStatus,
} from "../active-requests/active-requests.slice";
import {
  addUserTurn,
  attachClientMetrics,
  commitAssistantTurn,
} from "../instance-conversation-history/instance-conversation-history.slice";
import { clearUserInput } from "../instance-user-input/instance-user-input.slice";
import { clearAllResources } from "../instance-resources/instance-resources.slice";

// =============================================================================
// Assemble Request (pure selector logic, extracted for testability)
// =============================================================================

/**
 * Assembles the complete snake_case API request payload from all slices.
 * Scope fields are read from appContextSlice — the single source of truth.
 * This is a pure function of the Redux state — no side effects.
 */
export function assembleRequest(
  state: RootState,
  instanceId: string,
): AssembledAgentStartRequest | null {
  const instance = state.executionInstances.byInstanceId[instanceId];
  if (!instance) return null;

  // User input
  const userInputState = state.instanceUserInput.byInstanceId[instanceId];
  const textInput = userInputState?.text?.trim() ?? "";
  const contentBlocks = userInputState?.contentBlocks;

  // Resources → ContentBlock[]
  const resourcePayloads = selectResourcePayloads(instanceId)(state);

  // Build user_input
  let user_input: AssembledAgentStartRequest["user_input"];
  if (resourcePayloads.length > 0) {
    const blocks: Array<Record<string, unknown>> = [];
    if (textInput) blocks.push({ type: "text", text: textInput });
    if (contentBlocks) blocks.push(...contentBlocks);
    blocks.push(...resourcePayloads);
    user_input = blocks as AssembledAgentStartRequest["user_input"];
  } else if (contentBlocks && contentBlocks.length > 0) {
    const blocks: Array<Record<string, unknown>> = [];
    if (textInput) blocks.push({ type: "text", text: textInput });
    blocks.push(...contentBlocks);
    user_input = blocks as AssembledAgentStartRequest["user_input"];
  } else if (textInput) {
    user_input = textInput;
  }

  // Variables (three-tier resolved — uses instance-owned definitions snapshot)
  const variables = selectResolvedVariables(instanceId)(state);

  // Config overrides (ONLY deltas — uses instance-owned baseSettings snapshot)
  const config_overrides = selectSettingsOverridesForApi(instanceId)(state);

  // Context dict
  const context = selectContextPayload(instanceId)(state);

  // Client tools
  const clientToolsState = state.instanceClientTools.byInstanceId[instanceId];
  const client_tools =
    clientToolsState && clientToolsState.length > 0
      ? clientToolsState
      : undefined;

  // Scope — snapshot from appContextSlice at the moment of execution
  const organization_id = selectOrganizationId(state) ?? undefined;
  const workspace_id = selectWorkspaceId(state) ?? undefined;
  const project_id = selectProjectId(state) ?? undefined;
  const task_id = selectTaskId(state) ?? undefined;

  // Assemble snake_case body
  const request: AssembledAgentStartRequest = { stream: true };

  if (user_input !== undefined) request.user_input = user_input;
  if (Object.keys(variables).length > 0) request.variables = variables;
  if (config_overrides) request.config_overrides = config_overrides;
  if (context) request.context = context;
  if (client_tools) request.client_tools = client_tools;
  if (organization_id) request.organization_id = organization_id;
  if (workspace_id) request.workspace_id = workspace_id;
  if (project_id) request.project_id = project_id;
  if (task_id) request.task_id = task_id;

  return request;
}

// =============================================================================
// Execute Thunk
// =============================================================================

interface ExecuteInstanceArgs {
  instanceId: string;
  debug?: boolean;
}

interface ExecuteInstanceResult {
  requestId: string;
  conversationId: string | null;
}

export const executeInstance = createAsyncThunk<
  ExecuteInstanceResult,
  ExecuteInstanceArgs
>(
  "instances/execute",
  async (
    { instanceId, debug = false },
    { getState, dispatch, rejectWithValue },
  ) => {
    const requestId = generateRequestId();

    try {
      const state = getState() as RootState;
      const instance = state.executionInstances.byInstanceId[instanceId];

      if (!instance) {
        throw new Error(`Instance ${instanceId} not found`);
      }

      // Capture the user's input text BEFORE assembling (for history + display)
      const userInputEntry = state.instanceUserInput.byInstanceId[instanceId];
      const userInputText = userInputEntry?.text?.trim() ?? "";
      const userContentBlocks = userInputEntry?.contentBlocks ?? undefined;

      // Assemble the request
      const payload = assembleRequest(state, instanceId);
      if (!payload) {
        throw new Error(`Failed to assemble request for ${instanceId}`);
      }
      if (debug) payload.debug = true;

      // Resolve base URL from Redux (single source of truth)
      const baseUrl = selectResolvedBaseUrl(state as any);
      if (!baseUrl) {
        throw new Error("No backend URL configured");
      }

      // Build auth headers
      const accessToken = selectAccessToken(state);
      const fingerprintId = selectFingerprintId(state);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      } else if (fingerprintId) {
        headers["X-Fingerprint-ID"] = fingerprintId;
      }

      // Multi-turn routing: if this instance already has a conversationId,
      // continue the conversation; otherwise start a new agent run.
      const existingConversationId =
        selectLatestConversationId(instanceId)(state);

      // Add the user's message to history immediately — before the API call fires.
      // This makes the message appear in the UI instantly (optimistic update).
      if (userInputText || userContentBlocks) {
        dispatch(
          addUserTurn({
            instanceId,
            content: userInputText,
            ...(userContentBlocks && { contentBlocks: userContentBlocks }),
            conversationId: existingConversationId,
          }),
        );
      }

      // Create the request tracking entry
      dispatch(createRequest({ requestId, instanceId }));
      dispatch(setInstanceStatus({ instanceId, status: "running" }));
      dispatch(setRequestStatus({ requestId, status: "connecting" }));

      let url: string;
      let routedPayload: Record<string, unknown>;

      if (existingConversationId) {
        // Turn 2+: POST /api/ai/conversations/{conversationId}
        url = `${baseUrl}/api/ai/conversations/${existingConversationId}`;
        // Continuation only needs user_input, config_overrides, context, client_tools, stream
        routedPayload = {
          user_input: payload.user_input,
          stream: true,
          ...(payload.config_overrides && {
            config_overrides: payload.config_overrides,
          }),
          ...(payload.context && { context: payload.context }),
          ...(payload.client_tools && { client_tools: payload.client_tools }),
          ...(debug && { debug: true }),
        };
      } else {
        // Turn 1: POST /api/ai/agents/{agentId}
        url = `${baseUrl}/api/ai/agents/${instance.agentId}`;
        routedPayload = payload as unknown as Record<string, unknown>;
      }

      // Record the true submit moment — this is t=0 for all client timing.
      const submitAt = performance.now();

      // Fire the API call
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(routedPayload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Read conversation_id from header immediately — available before body.
      // Record when we received it: measures our internal overhead before the
      // server starts streaming (internalLatency = conversationIdAt - submitAt).
      const conversationIdFromHeader =
        response.headers.get("X-Conversation-ID");
      let conversationId: string | null = conversationIdFromHeader;
      const conversationIdAt = conversationId ? performance.now() : null;

      if (conversationId) {
        dispatch(setConversationId({ requestId, conversationId }));
      }

      dispatch(setInstanceStatus({ instanceId, status: "streaming" }));
      dispatch(setRequestStatus({ requestId, status: "streaming" }));

      // Parse stream using the shared NDJSON parser (backpressure-safe)
      const { events } = parseNdjsonStream(response);

      // Track completion data from the completion event for the assistant turn
      let tokenUsage:
        | { input: number; output: number; total: number }
        | undefined;
      let finishReason: string | undefined;
      let completionStats: CompletionStats | undefined;

      // Client-side event counters — never inspected mid-stream, computed once after.
      let clientFirstChunkAt: number | null = null;
      let totalEvents = 0;
      let chunkEvents = 0;
      let dataEvents = 0;
      let toolEvents = 0;
      let otherEvents = 0;
      let totalPayloadBytes = 0;

      for await (const event of events) {
        // Fire-and-forget counters — no blocking work done here
        totalEvents++;
        try {
          totalPayloadBytes += new TextEncoder().encode(
            JSON.stringify(event),
          ).length;
        } catch {
          // ignore encoding errors in metrics
        }
        if (isChunkEvent(event)) {
          chunkEvents++;
          if (clientFirstChunkAt === null)
            clientFirstChunkAt = performance.now();
          dispatch(appendChunk({ requestId, content: event.data.text }));
        } else if (isStatusUpdateEvent(event)) {
          otherEvents++;
          // Store status_update events — useful for "agent thinking" UI indicators
          dispatch(
            appendDataPayload({
              requestId,
              data: { status_update: event.data },
            }),
          );
        } else if (isDataEvent(event)) {
          dataEvents++;
          const data = event.data as Record<string, unknown>;
          // conversation_id arrives here too (redundant with header, but handle it)
          if (
            data.event === "conversation_id" &&
            typeof data.conversation_id === "string" &&
            !conversationId
          ) {
            conversationId = data.conversation_id;
            dispatch(setConversationId({ requestId, conversationId }));
          } else {
            dispatch(appendDataPayload({ requestId, data }));
          }
        } else if (isToolEventEvent(event)) {
          toolEvents++;
          const toolData = event.data;
          if (toolData.event === "tool_delegated") {
            dispatch(
              addPendingToolCall({
                requestId,
                toolCall: {
                  callId: toolData.call_id,
                  toolName: toolData.tool_name,
                  // arguments live in data.data when provided
                  arguments: (toolData.data as Record<string, unknown>) ?? {},
                },
              }),
            );
            dispatch(setInstanceStatus({ instanceId, status: "paused" }));
          }
          // tool_started, tool_progress, tool_completed, tool_error —
          // logged to dataPayloads for UI consumption
          else {
            dispatch(
              appendDataPayload({
                requestId,
                data: { tool_event: toolData },
              }),
            );
          }
        } else if (isContentBlockEvent(event)) {
          otherEvents++;
          // Structured content blocks — store for UI rendering
          dispatch(
            appendDataPayload({
              requestId,
              data: { content_block: event.data },
            }),
          );
        } else if (isCompletionEvent(event)) {
          otherEvents++;
          // Capture the full CompletionStats payload
          const d = event.data as Record<string, unknown>;

          // Build typed CompletionStats from the server payload
          completionStats = {
            status: (d.status as string) ?? "complete",
            iterations: (d.iterations as number) ?? 1,
            finish_reason: (d.finish_reason as string) ?? "stop",
            total_usage: (d.total_usage as CompletionStats["total_usage"]) ?? {
              by_model: {},
              total: {
                input_tokens: 0,
                output_tokens: 0,
                cached_input_tokens: 0,
                total_tokens: 0,
                total_requests: 0,
                unique_models: 0,
                total_cost: 0,
              },
            },
            timing_stats:
              (d.timing_stats as CompletionStats["timing_stats"]) ?? {
                total_duration: 0,
                api_duration: 0,
                tool_duration: 0,
                iterations: 1,
                avg_iteration_duration: 0,
              },
            tool_call_stats:
              (d.tool_call_stats as CompletionStats["tool_call_stats"]) ?? {
                total_tool_calls: 0,
                iterations_with_tools: 0,
                by_tool: {},
              },
            metadata: d.metadata ?? null,
          };

          // Derive tokenUsage/finishReason from the richer stats for backward compat
          const totalUsage = completionStats.total_usage?.total;
          if (totalUsage) {
            tokenUsage = {
              input: totalUsage.input_tokens,
              output: totalUsage.output_tokens,
              total: totalUsage.total_tokens,
            };
          }
          finishReason = completionStats.finish_reason;

          // Store raw completion data for telemetry
          dispatch(
            appendDataPayload({
              requestId,
              data: { completion: event.data },
            }),
          );
        } else if (isErrorEvent(event)) {
          otherEvents++;
          dispatch(
            setRequestStatus({
              requestId,
              status: "error",
              errorMessage: event.data.user_message ?? event.data.message,
            }),
          );
          dispatch(setInstanceStatus({ instanceId, status: "error" }));
        } else if (isEndEvent(event)) {
          otherEvents++;
          dispatch(setRequestStatus({ requestId, status: "complete" }));
          dispatch(setInstanceStatus({ instanceId, status: "complete" }));
        } else if (isHeartbeatEvent(event)) {
          otherEvents++;
          // Keep-alive ping — no action needed
        }
      }

      // Stream loop has exited — record the stream-end timestamp.
      const streamEndAt = performance.now();

      // Commit the completed assistant response to conversation history
      const finalState = getState() as RootState;
      const completedText =
        finalState.activeRequests.byRequestId[requestId]?.accumulatedText ?? "";
      const finalConversationId =
        finalState.activeRequests.byRequestId[requestId]?.conversationId ??
        conversationId;

      dispatch(
        commitAssistantTurn({
          instanceId,
          requestId,
          content: completedText,
          conversationId: finalConversationId,
          ...(tokenUsage && { tokenUsage }),
          ...(finishReason && { finishReason }),
          ...(completionStats && { completionStats }),
        }),
      );

      // Clear input text and resources now that the stream is done.
      // We do this here (after stream ends) not in the component, because the
      // thunk captured the input state at the top before anything was cleared.
      dispatch(clearUserInput(instanceId));
      dispatch(clearAllResources(instanceId));

      // Record when Redux commit + render is scheduled (approximation — the
      // actual paint happens asynchronously, but this captures the JS-thread
      // settle point which is the meaningful overhead we can detect).
      const renderCompleteAt = performance.now();

      // Compute and store all client metrics in a single fire-and-forget dispatch.
      const internalLatencyMs =
        conversationIdAt !== null ? conversationIdAt - submitAt : null;
      const ttftMs =
        clientFirstChunkAt !== null ? clientFirstChunkAt - submitAt : null;
      const streamDurationMs =
        clientFirstChunkAt !== null ? streamEndAt - clientFirstChunkAt : null;
      const renderDelayMs =
        streamEndAt !== null ? renderCompleteAt - streamEndAt : null;
      const totalClientDurationMs = renderCompleteAt - submitAt;

      const accumulatedTextBytes = new TextEncoder().encode(
        completedText,
      ).length;

      const clientMetrics: ClientMetrics = {
        submitAt,
        conversationIdAt,
        firstChunkAt: clientFirstChunkAt,
        streamEndAt,
        renderCompleteAt,
        internalLatencyMs,
        ttftMs,
        streamDurationMs,
        renderDelayMs,
        totalClientDurationMs,
        totalEvents,
        chunkEvents,
        dataEvents,
        toolEvents,
        otherEvents,
        accumulatedTextBytes,
        totalPayloadBytes,
      };

      dispatch(finalizeClientMetrics({ requestId, metrics: clientMetrics }));
      dispatch(attachClientMetrics({ instanceId, requestId, clientMetrics }));

      return { requestId, conversationId };
    } catch (error) {
      dispatch(
        setRequestStatus({
          requestId,
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        }),
      );
      dispatch(setInstanceStatus({ instanceId, status: "error" }));

      return rejectWithValue(
        error instanceof Error ? error.message : "Execution failed",
      );
    }
  },
);

// =============================================================================
// Clear After Send
// =============================================================================

/**
 * Atomically clears all input state after a successful send.
 * Clears user text input, content blocks, and all attached resources.
 * Call this after executeInstance resolves — keeps the instance alive
 * for follow-up turns while returning the input area to a clean state.
 */
export const clearAfterSend = createAsyncThunk<void, string>(
  "instances/clearAfterSend",
  async (instanceId, { dispatch }) => {
    const { clearUserInput } =
      await import("../instance-user-input/instance-user-input.slice");
    const { clearAllResources } =
      await import("../instance-resources/instance-resources.slice");

    dispatch(clearUserInput(instanceId));
    dispatch(clearAllResources(instanceId));
  },
);

// =============================================================================
// Submit Tool Results
// =============================================================================

interface SubmitToolResultsArgs {
  requestId: string;
  results: Array<{
    callId: string;
    toolName: string;
    output?: unknown;
    isError?: boolean;
    errorMessage?: string;
  }>;
}

export const submitToolResults = createAsyncThunk<void, SubmitToolResultsArgs>(
  "instances/submitToolResults",
  async ({ requestId, results }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const request = state.activeRequests.byRequestId[requestId];
      if (!request?.conversationId) {
        throw new Error("No conversation ID for tool result submission");
      }

      // Resolve base URL and auth (same as executeInstance)
      const baseUrl = selectResolvedBaseUrl(state as any);
      if (!baseUrl) throw new Error("No backend URL configured");

      const accessToken = selectAccessToken(state);
      const fingerprintId = selectFingerprintId(state);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      } else if (fingerprintId) {
        headers["X-Fingerprint-ID"] = fingerprintId;
      }

      // Map camelCase internal state to snake_case wire format
      const wireResults = results.map((r) => ({
        call_id: r.callId,
        tool_name: r.toolName,
        output: r.output,
        is_error: r.isError ?? false,
        error_message: r.errorMessage ?? null,
      }));

      const response = await fetch(
        `${baseUrl}/api/ai/conversations/${request.conversationId}/tool_results`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ results: wireResults }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Tool results submission failed: ${response.statusText}`,
        );
      }

      // Mark tool calls as resolved
      const { resolveToolCall } =
        await import("../active-requests/active-requests.slice");
      for (const result of results) {
        dispatch(resolveToolCall({ requestId, callId: result.callId }));
      }
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to submit tool results",
      );
    }
  },
);
