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
  selectProjectId,
  selectTaskId,
} from "@/features/agent-context/redux/appContextSlice";
import {
  selectAccessToken,
  selectFingerprintId,
} from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import {
  createRequest,
  setConversationId,
  setRequestStatus,
} from "../active-requests/active-requests.slice";
import { addUserTurn } from "../instance-conversation-history/instance-conversation-history.slice";
import { processStream } from "./process-stream";
import { upsertAgentConversationFromExecutionAction } from "@/features/agents/redux/agent-conversations";
import { formatVariablesForDisplay } from "@/features/agents/utils/variable-utils";

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
  conversationId: string,
): AssembledAgentStartRequest | null {
  const instance = state.executionInstances.byConversationId[conversationId];
  if (!instance) return null;

  const uiState = state.instanceUIState.byConversationId[conversationId];
  if (uiState?.usePreExecutionInput && !uiState.preExecutionSatisfied) {
    console.error(
      `[assembleRequest] BLOCKED: conversation ${conversationId} requires pre-execution input that has not been satisfied.`,
    );
    return null;
  }

  // User input
  const userInputState =
    state.instanceUserInput.byConversationId[conversationId];
  const textInput = userInputState?.text?.trim() ?? "";
  const contentBlocks = userInputState?.contentBlocks;

  // Resources → ContentBlock[]
  const resourcePayloads = selectResourcePayloads(conversationId)(state);
  // Variables (three-tier resolved — uses instance-owned definitions snapshot)
  const variables = selectResolvedVariables(conversationId)(state);

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

  // Config overrides (ONLY deltas — uses instance-owned baseSettings snapshot)
  const config_overrides = selectSettingsOverridesForApi(conversationId)(state);

  // Context dict
  const context = selectContextPayload(conversationId)(state);

  // Client tools
  const clientToolsState =
    state.instanceClientTools.byConversationId[conversationId];
  const client_tools =
    clientToolsState && clientToolsState.length > 0
      ? clientToolsState
      : undefined;

  // Scope — snapshot from appContextSlice at the moment of execution
  const organization_id = selectOrganizationId(state) ?? undefined;
  const project_id = selectProjectId(state) ?? undefined;
  const task_id = selectTaskId(state) ?? undefined;

  // Source tracking
  const { sourceApp, sourceFeature } = instance;

  // Assemble snake_case body
  const request: AssembledAgentStartRequest = { stream: true };

  if (user_input !== undefined) request.user_input = user_input;
  if (Object.keys(variables).length > 0) request.variables = variables;
  if (config_overrides) request.config_overrides = config_overrides;
  if (context) request.context = context;
  if (client_tools) request.client_tools = client_tools;
  if (organization_id) request.organization_id = organization_id;
  if (project_id) request.project_id = project_id;
  if (task_id) request.task_id = task_id;
  if (sourceApp) request.source_app = sourceApp;
  if (sourceFeature) request.source_feature = sourceFeature;

  return request;
}

// =============================================================================
// Execute Thunk
// =============================================================================

interface ExecuteInstanceArgs {
  conversationId: string;
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
    { conversationId, debug = false },
    { getState, dispatch, rejectWithValue },
  ) => {
    const requestId = generateRequestId();

    try {
      const state = getState() as RootState;
      const instance =
        state.executionInstances.byConversationId[conversationId];

      if (!instance) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Capture the user's input BEFORE assembling (for history + display).
      const userInputEntry =
        state.instanceUserInput.byConversationId[conversationId];
      const userInputText = userInputEntry?.text?.trim() ?? "";
      const userContentBlocks = userInputEntry?.contentBlocks ?? undefined;

      // Assemble the request
      const payload = assembleRequest(state, conversationId);
      if (!payload) {
        throw new Error(`Failed to assemble request for ${conversationId}`);
      }
      if (debug) payload.debug = true;

      const variables = payload.variables ?? undefined;

      // Format variables for display in the user message bubble.
      const variableLines = variables
        ? formatVariablesForDisplay(variables)
        : "";

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
        selectLatestConversationId(conversationId)(state);

      // Add the user's message to history immediately — before the API call fires.
      // Include resource payload blocks so they display even before the DB round-trip.
      // The condition covers: typed text, content blocks, resources, OR variables.
      const resourceBlocks =
        payload.user_input && Array.isArray(payload.user_input)
          ? (payload.user_input as Array<Record<string, unknown>>).filter(
              (b) => b["type"] !== "text",
            )
          : [];

      const displayContent = [variableLines, userInputText]
        .filter(Boolean)
        .join("\n");

      if (displayContent || userContentBlocks || resourceBlocks.length > 0) {
        dispatch(
          addUserTurn({
            conversationId,
            content: displayContent,
            messageParts:
              [...(userContentBlocks ?? []), ...resourceBlocks].length > 0
                ? [...(userContentBlocks ?? []), ...resourceBlocks]
                : undefined,
            serverConversationId: existingConversationId,
          }),
        );
      }

      // Create the request tracking entry
      dispatch(createRequest({ requestId, conversationId }));
      dispatch(setInstanceStatus({ conversationId, status: "running" }));
      dispatch(setRequestStatus({ requestId, status: "connecting" }));

      let url: string;
      let routedPayload: Record<string, unknown>;

      if (existingConversationId) {
        // Turn 2+: POST /ai/conversations/{conversationId}
        url = `${baseUrl}/ai/conversations/${existingConversationId}`;
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
        // Turn 1: POST /ai/agents/{agentId}
        url = `${baseUrl}/ai/agents/${instance.agentId}`;
        routedPayload = {
          ...payload,
          conversation_id: conversationId,
          is_new: true,
        } as Record<string, unknown>;
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
        let serverMessage = `${response.status} ${response.statusText}`;
        try {
          const body = await response.json();
          serverMessage =
            body?.detail?.message ?? body?.detail ?? serverMessage;
        } catch {
          /* non-JSON error body */
        }

        const code = response.status;
        if (code === 409) {
          throw new Error(`Conversation already exists: ${serverMessage}`);
        } else if (code === 404) {
          throw new Error(`Conversation not found: ${serverMessage}`);
        } else if (code === 422) {
          throw new Error(`Invalid conversation ID: ${serverMessage}`);
        }
        throw new Error(`API error: ${serverMessage}`);
      }

      const conversationIdFromHeader =
        response.headers.get("X-Conversation-ID");
      let headerConversationId: string | null = conversationIdFromHeader;
      const conversationIdAt = headerConversationId ? performance.now() : null;

      if (headerConversationId) {
        dispatch(
          setConversationId({
            requestId,
            conversationId: headerConversationId,
          }),
        );
        const syncList = upsertAgentConversationFromExecutionAction(
          getState() as RootState,
          conversationId,
          headerConversationId,
        );
        if (syncList) dispatch(syncList);
      }

      dispatch(setInstanceStatus({ conversationId, status: "streaming" }));
      dispatch(setRequestStatus({ requestId, status: "streaming" }));

      const currentUiState = (getState() as RootState).instanceUIState
        ?.byConversationId[conversationId];

      const streamResult = await processStream({
        requestId,
        conversationId,
        response,
        submitAt,
        conversationIdAt,
        initialConversationId: headerConversationId,
        dispatch,
        getState: getState as () => RootState,
        jsonExtraction: currentUiState?.jsonExtraction ?? undefined,
      });

      return {
        requestId,
        conversationId: streamResult.conversationId ?? conversationId,
      };
    } catch (error) {
      dispatch(
        setRequestStatus({
          requestId,
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        }),
      );
      dispatch(setInstanceStatus({ conversationId, status: "error" }));

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
  async (conversationId, { dispatch }) => {
    const { clearUserInput } =
      await import("../instance-user-input/instance-user-input.slice");
    const { clearAllResources } =
      await import("../instance-resources/instance-resources.slice");

    dispatch(clearUserInput(conversationId));
    dispatch(clearAllResources(conversationId));
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
        `${baseUrl}/ai/conversations/${request.conversationId}/tool_results`,
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
