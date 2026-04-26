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
import type { RootState } from "@/lib/redux/store.types";
import type {
  ChatRequestPayload,
  SystemInstruction,
} from "@/features/agents/types/agent-api-types";
import type { MessagePart } from "@/types/python-generated/stream-events";
import type { MessageRecord } from "../messages/messages.slice";
import {
  extractContentBlocks,
  extractFlatText,
} from "../messages/messages.selectors";
import { generateRequestId } from "../utils/ids";
import { setInstanceStatus } from "../conversations/conversations.slice";
import { selectSettingsForChatApi } from "../instance-model-overrides/instance-model-overrides.selectors";
import { selectResolvedVariables } from "../instance-variable-values/instance-variable-values.selectors";
import { selectContextPayload } from "../instance-context/instance-context.selectors";
import { selectResourcePayloads } from "../instance-resources/instance-resources.selectors";
import {
  selectAccessToken,
  selectFingerprintId,
} from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import {
  createRequest,
  setRequestStatus,
} from "../active-requests/active-requests.slice";
import { addOptimisticUserMessage } from "../messages/messages.slice";
import { processStream } from "./process-stream";
import { ENDPOINTS } from "@/lib/api/endpoints";
import {
  selectHasMessages,
  selectMessageCount,
} from "../messages/messages.selectors";
import { v4 as uuidv4 } from "uuid";
import type { CxContentBlock } from "@/features/public-chat/types/cx-tables";
import {
  registerAbortController,
  unregisterAbortController,
} from "./abort-registry";
import { resilientFetch } from "@/lib/net/resilient-fetch";
import { toNetError } from "@/lib/net/errors";
import { payloadSafetyStore } from "@/lib/persistence/payloadSafetyStore";
import {
  startRequest as startNetRequest,
  setPhase as setNetPhase,
  beatHeartbeat as beatNetHeartbeat,
  finishRequest as finishNetRequest,
} from "@/lib/redux/net/netRequestsSlice";
import { assertConversationIdMatches } from "../utils/assert-conversation-id";
import { callbackManager } from "@/utils/callbackManager";
import {
  deriveClientToolsFromHandle,
  isWidgetActionName,
  type WidgetHandle,
} from "@/features/agents/types/widget-handle.types";
import {
  selectIsBlockMode,
  selectIsMemoryToggleRequested,
  selectIsSnapshot,
  selectMemoryModel,
  selectMemoryScope,
  selectMemoryToggleTarget,
  selectWidgetHandleIdFor,
} from "../instance-ui-state/instance-ui-state.selectors";
import { clearMemoryToggleRequest } from "../instance-ui-state/instance-ui-state.slice";
import { setMemoryEnabledOptimistic } from "../observational-memory/observational-memory.slice";

// =============================================================================
// Turn Conversion Utility
// =============================================================================

/**
 * Converts `MessageRecord[]` to the wire format the chat endpoint expects.
 * Each record becomes `{ role, content }` where content is a `CxContentBlock[]`
 * — the same shape `cx_message.content` stores, pulled directly from the
 * record via `extractContentBlocks`. Falls back to a single text block
 * synthesised from flat text when a record has no structured blocks yet
 * (e.g. an optimistic user message pre-reservation).
 */
function recordsToMessages(
  records: MessageRecord[],
): Array<{ role: string; content: unknown }> {
  return records.map((record) => {
    const blocks = extractContentBlocks(record);
    if (blocks.length > 0) {
      return { role: record.role, content: blocks };
    }
    const text = extractFlatText(record);
    return {
      role: record.role,
      content: [{ type: "text", text }],
    };
  });
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
  const instance = state.conversations.byConversationId[conversationId];
  if (!instance) return null;

  const preExecState = state.instanceUIState.byConversationId[conversationId];
  if (
    preExecState?.showPreExecutionGate &&
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

  // 2. Conversation history (already committed user + assistant messages)
  const messagesEntry = state.messages.byConversationId[conversationId];
  if (messagesEntry) {
    const orderedRecords: MessageRecord[] = [];
    for (const id of messagesEntry.orderedIds) {
      const record = messagesEntry.byId[id];
      if (record && record.role !== "system") orderedRecords.push(record);
    }
    if (orderedRecords.length > 0) {
      messages.push(...recordsToMessages(orderedRecords));
    }
  }

  // 3. Current user input (the new message being sent)
  // DATA CONTRACT: send the user's input verbatim. Whitespace is meaningful.
  const userInputState =
    state.instanceUserInput.byConversationId[conversationId];
  const textInput = userInputState?.text ?? "";
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

  // Client tools — per-turn derivation from widget handle + slice (see
  // execute-instance.thunk.ts for full rationale).
  const nonWidgetClientTools = (
    state.instanceClientTools.byConversationId[conversationId] ?? []
  ).filter((name) => !isWidgetActionName(name));
  const widgetHandleId = selectWidgetHandleIdFor(state, conversationId);
  const widgetHandle = widgetHandleId
    ? callbackManager.get<WidgetHandle>(widgetHandleId)
    : null;
  const widgetClientTools = deriveClientToolsFromHandle(widgetHandle);
  const mergedClientTools = [...nonWidgetClientTools, ...widgetClientTools];
  const client_tools =
    mergedClientTools.length > 0 ? mergedClientTools : undefined;

  // Conversation ID (reuse if configured)
  // const reuseConversationId = uiState?.reuseConversationId ?? true;
  const reuseConversationId = true;
  const hasHistory = selectHasMessages(conversationId)(state);

  console.log("[assembleChatRequest] hasHistory", hasHistory);
  console.log("[assembleChatRequest] reuseConversationId", reuseConversationId);

  // Source tracking
  const { sourceApp, sourceFeature } = instance;

  // Ephemeral overrides: a conversation flagged `isEphemeral` is stateless on
  // the server side. `store:false` suppresses all DB writes (cx_conversation,
  // cx_message, cx_user_request, cx_request, cx_tool_call), and `is_new:false`
  // skips the new-conversation branch on the server. Redux is the only
  // source of truth for the transcript — the full history is already in
  // `messages[]` above (priming + turns).
  const isEphemeral = instance.isEphemeral === true;

  // Assemble the flat payload
  const request: Partial<ChatRequestPayload> = {
    ai_model_id,
    messages: messages as ChatRequestPayload["messages"],
    stream: true,
    // Ephemeral forces store:false regardless of builder override.
    store: isEphemeral ? false : (advancedSettings?.store ?? true),
    debug: advancedSettings?.debug ?? false,
    max_iterations: advancedSettings?.maxIterations ?? 20,
    max_retries_per_iteration: advancedSettings?.maxRetriesPerIteration ?? 2,
    ...fullSettings,
  };

  if (isEphemeral) {
    // No DB row exists; every turn is a fresh stateless call. We still
    // stamp `conversation_id` so logs can correlate turns, but the server
    // will not create or update any persistent record.
    request.is_new = false;
    request.conversation_id = conversationId;
  } else if (hasHistory && reuseConversationId) {
    request.is_new = false;
    request.conversation_id = conversationId;
  } else if (hasHistory && !reuseConversationId) {
    // Builder "branch" mode: mint a new conversationId so the prior run
    // stays intact server-side. `conversation_id` is intentionally omitted.
    request.is_new = true;
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

  // Admin-only global flags — read at execute time so the latest toggle
  // value applies to every outbound chat-manual call.
  if (selectIsBlockMode(state)) request.block_mode = true;
  if (selectIsSnapshot(state)) request.snapshot = true;

  // Observational Memory — one-shot per-conversation toggle. Payload writes
  // ONLY when the admin explicitly requested a toggle this turn. The
  // execute thunk is responsible for clearing the request + pushing the
  // optimistic Redux update after assembly.
  if (selectIsMemoryToggleRequested(state)) {
    const target = selectMemoryToggleTarget(state);
    request.memory = target;
    if (target) {
      const memoryModel = selectMemoryModel(state);
      const memoryScope = selectMemoryScope(state);
      if (memoryModel) request.memory_model = memoryModel;
      if (memoryScope) request.memory_scope = memoryScope;
    }
  }

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
    let recoveryId: string | null = null;

    try {
      const state = getState() as RootState;
      const instance = state.conversations.byConversationId[conversationId];

      if (!instance) {
        throw new Error(`Instance ${conversationId} not found`);
      }

      // Capture user input BEFORE assembling (for history + display).
      // Verbatim — never trim/normalize the user's typed text.
      const userInputEntry =
        state.instanceUserInput.byConversationId[conversationId];
      const userInputText = userInputEntry?.text ?? "";
      const userMessageParts = userInputEntry?.messageParts ?? undefined;

      // Assemble the chat request — reads FRESH from agent definition
      const payload = assembleChatRequest(state, conversationId);
      if (!payload) {
        throw new Error(
          `Failed to assemble chat request for ${conversationId}. Check that the agent has a modelId set.`,
        );
      }

      // Observational Memory — if we emitted a `memory` signal this turn,
      // mirror it optimistically into the observational-memory slice so the
      // Creator Panel toggle reflects the change immediately, and clear the
      // queued one-shot toggle so it doesn't re-fire next turn.
      if (typeof payload.memory === "boolean") {
        dispatch(
          setMemoryEnabledOptimistic({
            conversationId,
            enabled: payload.memory,
            model: payload.memory_model ?? null,
            scope: payload.memory_scope ?? null,
          }),
        );
        dispatch(clearMemoryToggleRequest());
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

      // Optimistic user message — push to messages.byId before the API
      // call. When `record_reserved cx_message role=user` lands, the stream
      // promotes the temp id to the server `cx_message.id`.
      const resourcePayloads = selectResourcePayloads(conversationId)(state);
      const resourceBlocks = resourcePayloads.filter((b) => b.type !== "text");
      let userMessageClientTempId: string | undefined;
      if (userInputText || userMessageParts || resourceBlocks.length > 0) {
        const content: CxContentBlock[] = [
          ...(userInputText
            ? [
                {
                  type: "text",
                  text: userInputText,
                } as unknown as CxContentBlock,
              ]
            : []),
          ...((userMessageParts as unknown as CxContentBlock[] | undefined) ??
            []),
          ...(resourceBlocks as unknown as CxContentBlock[]),
        ];
        userMessageClientTempId = uuidv4();
        const nextPosition = selectMessageCount(conversationId)(
          getState() as RootState,
        );
        dispatch(
          addOptimisticUserMessage({
            conversationId,
            clientTempId: userMessageClientTempId,
            content,
            position: nextPosition,
          }),
        );
      }

      // Create request tracking entry
      dispatch(createRequest({ requestId, conversationId }));
      dispatch(setInstanceStatus({ conversationId, status: "running" }));
      dispatch(setRequestStatus({ requestId, status: "connecting" }));

      // Also register in the global netRequests slice so the connection-health
      // UI (RequestRecoveryProvider, error cards, etc.) can see this request.
      dispatch(
        startNetRequest({
          id: requestId,
          kind: "agent-run",
          label: `Agent: ${instance.agentId}`,
          groupKey: conversationId,
        }),
      );

      // Consume any pending cache-bypass flags for this conversation —
      // direct DB writes (edits, forks, deletes) leave the server's agent
      // cache stale; this one-shot flag rebuilds it.
      const { consumePendingCacheBypass } =
        await import("../message-crud/cache-bypass.slice");
      const pendingBypass = dispatch(
        consumePendingCacheBypass(conversationId) as never,
      ) as unknown as
        | import("../message-crud/cache-bypass.slice").CacheBypassFlags
        | null;
      const outboundPayload = pendingBypass
        ? { ...payload, cache_bypass: pendingBypass }
        : payload;

      const submitAt = performance.now();

      // Persist to recovery store BEFORE firing the network call. If the tab
      // closes or the server never responds, this record stays in IndexedDB
      // and the RequestRecoveryProvider will surface it on next load.
      try {
        recoveryId = await payloadSafetyStore.savePending({
          kind: "agent-run",
          label:
            typeof window !== "undefined"
              ? `Agent run — ${document?.title ?? "matrx"}`
              : "Agent run",
          routeHref:
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : "/agents",
          payload: outboundPayload,
          rawUserInput: userInputText || undefined,
        });
      } catch {
        // IndexedDB unavailable — proceed without recovery coverage.
        recoveryId = null;
      }

      // Always POST to the manual endpoint
      const url = `${baseUrl}${ENDPOINTS.ai.manual}`;
      const abortController = new AbortController();
      registerAbortController(conversationId, abortController);

      // Streaming request: bounded connect timeout, no wall-clock ceiling
      // (the stream-monitor / heartbeat watchdog is the streaming ceiling).
      const { response } = await resilientFetch(
        url,
        {
          method: "POST",
          headers,
          body: JSON.stringify(outboundPayload),
        },
        {
          connectTimeoutMs: 15_000,
          totalTimeoutMs: null,
          signal: abortController.signal,
          throwOnHttpError: false,
        },
      );

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
      assertConversationIdMatches(
        conversationId,
        headerConversationId,
        "x-conversation-id-header",
      );
      const conversationIdAt = headerConversationId ? performance.now() : null;

      dispatch(setInstanceStatus({ conversationId, status: "streaming" }));
      dispatch(setRequestStatus({ requestId, status: "streaming" }));
      dispatch(setNetPhase({ id: requestId, phase: "streaming" }));

      const currentUiState = (getState() as RootState).instanceUIState
        ?.byConversationId[conversationId];

      await processStream({
        requestId,
        conversationId,
        response,
        submitAt,
        conversationIdAt,
        dispatch,
        getState: getState as () => RootState,
        jsonExtraction: currentUiState?.jsonExtraction ?? undefined,
        onEvent: () => {
          dispatch(beatNetHeartbeat(requestId));
        },
        abortController,
        heartbeatTimeoutMs: 30_000,
        maxLifetimeMs: 600_000,
        userMessageClientTempId,
      });

      unregisterAbortController(conversationId);
      dispatch(finishNetRequest({ id: requestId, phase: "completed" }));
      if (recoveryId) {
        void payloadSafetyStore.markSuccess(recoveryId).catch(() => {});
      }
      return {
        requestId,
        conversationId,
      };
    } catch (error) {
      unregisterAbortController(conversationId);

      if (error instanceof Error && error.name === "AbortError") {
        dispatch(setInstanceStatus({ conversationId, status: "cancelled" }));
        dispatch(finishNetRequest({ id: requestId, phase: "cancelled" }));
        if (recoveryId) {
          void payloadSafetyStore.deleteEntry(recoveryId).catch(() => {});
        }
        return rejectWithValue("Cancelled");
      }

      const netErr = toNetError(error);
      if (recoveryId) {
        void payloadSafetyStore
          .markFailed(recoveryId, netErr.message)
          .catch(() => {});
      }
      const phase =
        netErr.code === "connect-timeout" ||
        netErr.code === "total-timeout" ||
        netErr.code === "heartbeat-timeout"
          ? "timed-out"
          : "error";
      dispatch(
        finishNetRequest({
          id: requestId,
          phase,
          errorCode: netErr.code,
          errorMessage: netErr.message,
          retryable: netErr.retryable,
        }),
      );

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
