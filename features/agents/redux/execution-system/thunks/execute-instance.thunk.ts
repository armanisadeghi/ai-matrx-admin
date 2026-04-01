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
  setConversationId,
  setRequestStatus,
} from "../active-requests/active-requests.slice";
import {
  addUserTurn,
  commitAssistantTurn,
  clearHistory,
} from "../instance-conversation-history/instance-conversation-history.slice";
import { selectAutoClearConversation } from "../instance-ui-state/instance-ui-state.selectors";

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

      // Fire the API call
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(routedPayload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Read conversation_id from header immediately — available before body
      const conversationIdFromHeader =
        response.headers.get("X-Conversation-ID");
      let conversationId: string | null = conversationIdFromHeader;

      if (conversationId) {
        dispatch(setConversationId({ requestId, conversationId }));
      }

      dispatch(setInstanceStatus({ instanceId, status: "streaming" }));
      dispatch(setRequestStatus({ requestId, status: "streaming" }));

      // Parse stream using the shared NDJSON parser (backpressure-safe)
      const { events } = parseNdjsonStream(response);

      // Track token usage from the completion event for the assistant turn
      let tokenUsage:
        | { input: number; output: number; total: number }
        | undefined;
      let finishReason: string | undefined;

      for await (const event of events) {
        if (isChunkEvent(event)) {
          dispatch(appendChunk({ requestId, content: event.data.text }));
        } else if (isStatusUpdateEvent(event)) {
          // Store status_update events — useful for "agent thinking" UI indicators
          dispatch(
            appendDataPayload({
              requestId,
              data: { status_update: event.data },
            }),
          );
        } else if (isDataEvent(event)) {
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
          // Structured content blocks — store for UI rendering
          dispatch(
            appendDataPayload({
              requestId,
              data: { content_block: event.data },
            }),
          );
        } else if (isCompletionEvent(event)) {
          // Extract token usage and finish reason for the history turn
          const d = event.data as Record<string, unknown>;
          if (typeof d.input_tokens === "number") {
            tokenUsage = {
              input: d.input_tokens as number,
              output: (d.output_tokens as number) ?? 0,
              total:
                (d.total_tokens as number) ??
                (d.input_tokens as number) + ((d.output_tokens as number) ?? 0),
            };
          }
          if (typeof d.finish_reason === "string") {
            finishReason = d.finish_reason as string;
          }
          // Store raw completion data for telemetry
          dispatch(
            appendDataPayload({
              requestId,
              data: { completion: event.data },
            }),
          );
        } else if (isErrorEvent(event)) {
          dispatch(
            setRequestStatus({
              requestId,
              status: "error",
              errorMessage: event.data.user_message ?? event.data.message,
            }),
          );
          dispatch(setInstanceStatus({ instanceId, status: "error" }));
        } else if (isEndEvent(event)) {
          dispatch(setRequestStatus({ requestId, status: "complete" }));
          dispatch(setInstanceStatus({ instanceId, status: "complete" }));
        } else if (isHeartbeatEvent(event)) {
          // Keep-alive ping — no action needed
        }
      }

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
        }),
      );

      // autoClearConversation: wipe the history so the next submission starts fresh.
      // Used in builder/test mode where each send is independent.
      const shouldAutoClear = selectAutoClearConversation(instanceId)(
        getState() as RootState,
      );
      if (shouldAutoClear) {
        dispatch(clearHistory(instanceId));
      }

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
