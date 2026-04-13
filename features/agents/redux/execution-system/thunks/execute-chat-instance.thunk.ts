/**
 * Execute Chat Instance Thunk
 *
 * The builder's execution path — always hits POST /api/ai/chat with the
 * full agent definition read FRESH from Redux at execution time.
 *
 * Unlike executeInstance (which routes to /agents/{id} or /conversations/{id}),
 * this thunk:
 *   1. Reads the LIVE agent definition (including unsaved dirty edits)
 *   2. Converts all priming messages + conversation history + user input into
 *      the flat messages[] array the chat endpoint expects
 *   3. Spreads LLM params flat (NOT as config_overrides)
 *   4. Includes builder advanced settings (debug, store, max_iterations, etc.)
 *   5. Always POSTs to /api/ai/chat
 *   6. Reuses the shared processStream() helper for NDJSON handling
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  ChatRequestPayload,
  SystemInstruction,
} from "@/features/agents/types/agent-api-types";
import type { MessagePart } from "@/types/python-generated/stream-events";
import type { ConversationTurn } from "../instance-conversation-history/instance-conversation-history.slice";
import { generateRequestId } from "../utils";
import { setInstanceStatus } from "../execution-instances";
import { selectSettingsForChatApi } from "../instance-model-overrides";
import { selectResolvedVariables } from "../instance-variable-values";
import { selectContextPayload } from "../instance-context";
import { selectResourcePayloads } from "../instance-resources";
import { selectLatestConversationId } from "../selectors/aggregate.selectors";
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
import { ENDPOINTS } from "@/lib/api/endpoints";
import { upsertAgentConversationFromExecutionAction } from "@/features/agents/redux/agent-conversations";

// =============================================================================
// Turn Conversion Utility
// =============================================================================

/**
 * Converts ConversationTurn[] to the wire format the chat endpoint expects.
 * Each turn becomes { role, content } where content is either the text-wrapped
 * content parts array or the raw contentBlocks if they exist.
 */
function turnsToMessages(
  turns: ConversationTurn[],
): Array<{ role: string; content: unknown }> {
  return turns.map((turn) => ({
    role: turn.role,
    content:
      turn.renderBlocks && turn.renderBlocks.length > 0
        ? turn.renderBlocks
        : [{ type: "text", text: turn.content }],
  }));
}

// =============================================================================
// System Message Text Extraction
// =============================================================================

/**
 * Extracts plain text from a system message's content field.
 * Agent definition messages store content as an array of content parts.
 * This flattens them into a single string for the structured system_instruction.
 */
function extractSystemText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block === "object" && "text" in block)
          return String((block as Record<string, unknown>).text ?? "");
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  return "";
}

// =============================================================================
// Assemble Chat Request
// =============================================================================

/**
 * Builds the flat chat endpoint payload by reading FRESH from all Redux sources.
 *
 * Key differences from assembleRequest() in execute-instance.thunk.ts:
 *  - Reads agent definition FRESH (not snapshotted) — captures dirty edits
 *  - Spreads LLM params flat at the top level (NOT as config_overrides)
 *  - Includes priming messages + history turns + new user input in messages[]
 *  - Includes builder advanced settings (debug, store, max_iterations, etc.)
 */
export function assembleChatRequest(
  state: RootState,
  conversationId: string,
): Partial<ChatRequestPayload> | null {
  const instance = state.executionInstances.byConversationId[conversationId];
  if (!instance) return null;

  const preExecState = state.instanceUIState.byConversationId[conversationId];
  if (
    preExecState?.usePreExecutionInput &&
    !preExecState.preExecutionSatisfied
  ) {
    console.error(
      `[assembleChatRequest] BLOCKED: instance ${conversationId} requires pre-execution input that has not been satisfied.`,
    );
    return null;
  }

  const { agentId } = instance;
  const agent = state.agentDefinition.agents?.[agentId];
  if (!agent) return null;

  // Required field: model ID
  const ai_model_id = agent.modelId;
  if (!ai_model_id) return null;

  // Builder UI state — read early because structured system instruction toggle needs it
  const uiState = state.instanceUIState.byConversationId[conversationId];
  const advancedSettings = uiState?.builderAdvancedSettings;

  // Structured system instruction toggle
  const useStructured =
    advancedSettings?.useStructuredSystemInstruction ?? false;

  // Build messages array: priming messages + history turns + new user input
  const messages: Array<{ role: string; content: unknown }> = [];
  let structuredSystemInstruction: SystemInstruction | undefined;

  // 1. Agent's priming messages (system + conversation starters)
  if (agent.messages && agent.messages.length > 0) {
    for (const msg of agent.messages) {
      if (useStructured && msg.role === "system") {
        const textContent = extractSystemText(msg.content);
        const userOverrides = advancedSettings?.structuredInstruction ?? {};
        structuredSystemInstruction = {
          content: textContent,
          include_date: true,
          ...userOverrides,
        };
      } else {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }
  }

  // 2. Conversation history turns (already committed user + assistant turns)
  const historyEntry =
    state.instanceConversationHistory.byConversationId[conversationId];
  if (historyEntry?.turns && historyEntry.turns.length > 0) {
    messages.push(...turnsToMessages(historyEntry.turns));
  }

  // 3. Current user input (the new message being sent)
  const userInputState =
    state.instanceUserInput.byConversationId[conversationId];
  const textInput = userInputState?.text?.trim() ?? "";
  const userMessageParts = userInputState?.messageParts;
  const resourcePayloads = selectResourcePayloads(conversationId)(state);

  if (textInput || userMessageParts || resourcePayloads.length > 0) {
    const parts: MessagePart[] = [];
    if (textInput) parts.push({ type: "text", text: textInput });
    if (userMessageParts) parts.push(...userMessageParts);
    if (resourcePayloads.length > 0) parts.push(...resourcePayloads);

    messages.push({
      role: "user",
      content: parts.length === 1 && parts[0].type === "text" ? parts : parts,
    });
  }

  // LLM params — full merged settings spread flat (NOT as config_overrides).
  // Uses selectSettingsForChatApi, which strips UI-only capability flags
  // (tools, image_urls, file_urls, youtube_videos, multi_speaker) that must
  // not be sent to the backend. The actual tool list goes through request.tools
  // below (from agent.tools), not through LLMParams.
  const fullSettings = selectSettingsForChatApi(conversationId)(state);

  // Variables
  const variables = selectResolvedVariables(conversationId)(state);

  // Context
  const context = selectContextPayload(conversationId)(state);

  // Tools
  const tools = agent.tools && agent.tools.length > 0 ? agent.tools : undefined;
  const custom_tools =
    agent.customTools && agent.customTools.length > 0
      ? (agent.customTools as unknown as Array<Record<string, unknown>>)
      : undefined;

  // Client tools
  const clientToolsState =
    state.instanceClientTools.byConversationId[conversationId];
  const client_tools =
    clientToolsState && clientToolsState.length > 0
      ? clientToolsState
      : undefined;

  // Conversation ID (reuse if configured)
  const reuseConversationId = uiState?.reuseConversationId ?? false;
  const existingConversationId = reuseConversationId
    ? selectLatestConversationId(conversationId)(state)
    : undefined;

  // Source tracking
  const { sourceApp, sourceFeature } = instance;

  // Assemble the flat payload
  const request: Partial<ChatRequestPayload> = {
    ai_model_id,
    messages: messages as ChatRequestPayload["messages"],
    stream: true,
    store: advancedSettings?.store ?? true,
    debug: advancedSettings?.debug ?? false,
    max_iterations: advancedSettings?.maxIterations ?? 20,
    max_retries_per_iteration: advancedSettings?.maxRetriesPerIteration ?? 2,
    ...fullSettings,
  };

  if (existingConversationId) {
    request.conversation_id = existingConversationId;
    request.is_new = false;
  } else {
    request.conversation_id = conversationId;
    request.is_new = true;
  }
  if (Object.keys(variables).length > 0)
    request.variables = variables as Record<string, unknown>;
  if (context) request.context = context;
  if (tools) request.tools = tools;
  if (custom_tools) request.custom_tools = custom_tools;
  if (client_tools) request.client_tools = client_tools;
  if (structuredSystemInstruction)
    request.system_instruction =
      structuredSystemInstruction as unknown as string;
  if (sourceApp) request.source_app = sourceApp;
  if (sourceFeature) request.source_feature = sourceFeature;

  // Stable agx_agent.id for server logging / linkage (chat has no /agents/{id} URL).
  // Version snapshots use parentAgentId; live agents use their own id.
  request.agent_id = agent.parentAgentId ?? agent.id;
  request.is_version = agent.isVersion;

  return request;
}

// =============================================================================
// Execute Chat Instance Thunk
// =============================================================================

interface ExecuteChatInstanceArgs {
  conversationId: string;
}

interface ExecuteChatInstanceResult {
  requestId: string;
  conversationId: string | null;
}

export const executeChatInstance = createAsyncThunk<
  ExecuteChatInstanceResult,
  ExecuteChatInstanceArgs
>(
  "instances/executeChat",
  async ({ conversationId }, { getState, dispatch, rejectWithValue }) => {
    const requestId = generateRequestId();

    try {
      const state = getState() as RootState;
      const instance =
        state.executionInstances.byConversationId[conversationId];

      if (!instance) {
        throw new Error(`Instance ${conversationId} not found`);
      }

      // Capture user input BEFORE assembling (for history + display)
      const userInputEntry =
        state.instanceUserInput.byConversationId[conversationId];
      const userInputText = userInputEntry?.text?.trim() ?? "";
      const userMessageParts = userInputEntry?.messageParts ?? undefined;

      // Assemble the chat request — reads FRESH from agent definition
      const payload = assembleChatRequest(state, conversationId);
      if (!payload) {
        throw new Error(
          `Failed to assemble chat request for ${conversationId}. Check that the agent has a modelId set.`,
        );
      }

      // Resolve base URL
      const baseUrl = selectResolvedBaseUrl(state);
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

      // Optimistic user turn — add to history before the API call
      const resourcePayloads = selectResourcePayloads(conversationId)(state);
      const resourceBlocks = resourcePayloads.filter((b) => b.type !== "text");
      if (userInputText || userMessageParts || resourceBlocks.length > 0) {
        const existingConversationId =
          selectLatestConversationId(conversationId)(state);
        dispatch(
          addUserTurn({
            conversationId,
            content: userInputText,
            messageParts:
              [...(userMessageParts ?? []), ...resourceBlocks].length > 0
                ? [...(userMessageParts ?? []), ...resourceBlocks]
                : undefined,
            serverConversationId: existingConversationId,
          }),
        );
      }

      // Create request tracking entry
      dispatch(createRequest({ requestId, conversationId }));
      dispatch(setInstanceStatus({ conversationId, status: "running" }));
      dispatch(setRequestStatus({ requestId, status: "connecting" }));

      const submitAt = performance.now();

      // Always POST to the chat endpoint
      const url = `${baseUrl}${ENDPOINTS.ai.chat}`;
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
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

      const headerConversationId = response.headers.get("X-Conversation-ID");
      let serverConversationIdFromHeader: string | null = headerConversationId;
      const conversationIdAt = serverConversationIdFromHeader
        ? performance.now()
        : null;

      if (serverConversationIdFromHeader) {
        dispatch(
          setConversationId({
            requestId,
            conversationId: serverConversationIdFromHeader,
          }),
        );
        const syncList = upsertAgentConversationFromExecutionAction(
          getState() as RootState,
          conversationId,
          serverConversationIdFromHeader,
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
        initialConversationId: serverConversationIdFromHeader,
        dispatch,
        getState: getState as () => RootState,
        jsonExtraction: currentUiState?.jsonExtraction ?? undefined,
      });

      return {
        requestId,
        conversationId: streamResult.conversationId,
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
        error instanceof Error ? error.message : "Chat execution failed",
      );
    }
  },
);
