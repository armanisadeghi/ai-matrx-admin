/**
 * Execute Agent Thunk
 *
 * Drives the full agent execution lifecycle:
 *   1. Checks if the execution payload is ready; fetches it if not.
 *   2. Resolves variable values (user overrides → template substitution).
 *   3. Builds the messages array (system + template + user input).
 *   4. POSTs to /api/ai/chat (NDJSON streaming).
 *   5. Fans streaming events into socketResponseSlice + agentExecution slice.
 *
 * Python owns all DB persistence — this thunk does NOT write to ai_runs,
 * agent_runs, or any other table.
 */

import { createAsyncThunk } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { ENDPOINTS, BACKEND_URLS } from "@/lib/api/endpoints";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import { parseHttpError } from "@/lib/api/errors";
import { selectAccessToken } from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import {
  addResponse,
  appendTextChunk,
  updateErrorResponse,
  markResponseEnd,
} from "@/lib/redux/socket-io/slices/socketResponseSlice";
import {
  initializeTask,
  setTaskListenerIds,
  setTaskStreaming,
  completeTask,
  setTaskError,
} from "@/lib/redux/socket-io/slices/socketTasksSlice";

import type {
  ChunkPayload,
  ErrorPayload,
} from "@/types/python-generated/stream-events";

import {
  selectAgentExecutionPayload,
  selectAgentById,
} from "@/features/agents/redux/agent-definition/selectors";
import { fetchAgentExecutionMinimal } from "@/features/agents/redux/agent-definition/thunks";

import {
  addUserMessage,
  addAssistantMessage,
  setStatus,
  setError as setExecutionError,
  setCurrentTaskId,
  markStreamEnd,
} from "../slice";
import {
  selectVariableValues,
  selectCurrentInput,
  selectInstanceMessages,
} from "../selectors";
import type { ExecuteAgentMessagePayload } from "../types";

type ThunkApi = { dispatch: AppDispatch; state: RootState };

/** Substitutes {{variableName}} tokens in text using the provided values map. */
function applyVariableSubstitution(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => values[name] ?? "");
}

export const executeAgentMessage = createAsyncThunk<
  void,
  ExecuteAgentMessagePayload,
  ThunkApi
>(
  "agentExecution/executeMessage",
  async ({ runId, userInput }, { dispatch, getState }) => {
    const state = getState();

    // ── 1. Resolve instance & execution payload ──────────────────────────
    const instance = state.agentExecution.instances[runId];
    if (!instance) {
      throw new Error(`No agent execution instance found for runId: ${runId}`);
    }

    let payload = selectAgentExecutionPayload(state, instance.agentId);

    if (!payload.isReady) {
      dispatch(setStatus({ runId, status: "initializing" }));
      await dispatch(fetchAgentExecutionMinimal(instance.agentId)).unwrap();
      payload = selectAgentExecutionPayload(getState(), instance.agentId);
    }

    if (!payload.isReady || !payload.resolvedId) {
      dispatch(
        setExecutionError({ runId, error: "Agent data could not be loaded." }),
      );
      return;
    }

    // ── 2. Resolve input ─────────────────────────────────────────────────
    const input = userInput ?? selectCurrentInput(state, runId) ?? "";

    if (!input.trim()) {
      return; // Nothing to send
    }

    // ── 3. Variable substitution ─────────────────────────────────────────
    const variableValues = selectVariableValues(state, runId);

    // ── 4. Build message list ────────────────────────────────────────────
    const agentRecord = selectAgentById(getState(), instance.agentId);
    const templateMessages = agentRecord?.messages ?? [];

    // Existing conversation history (excludes system + template messages)
    const conversationHistory = selectInstanceMessages(state, runId)
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Convert template messages (AgentDefinitionMessage[]) to the API wire format.
    // AgentDefinitionMessage.content is Array<TextBlock | ImageBlock | ...>.
    // For the /ai/chat endpoint we send each message as
    //   { role, content: ContentBlock[] }
    // and apply variable substitution to TextBlock.text on the first send.
    const processedTemplate = templateMessages.map((m) => ({
      role: m.role,
      content: m.content.map((block) => {
        if (block.type === "text" && instance.requiresVariableReplacement) {
          return {
            ...block,
            text: applyVariableSubstitution(block.text, variableValues),
          };
        }
        return block;
      }),
    }));

    // Final messages for the API
    const apiMessages = [
      ...processedTemplate,
      ...conversationHistory,
      {
        role: "user" as const,
        content: [{ type: "text" as const, text: input }],
      },
    ];

    // ── 5. Record user message in slice ──────────────────────────────────
    dispatch(addUserMessage({ runId, content: input }));
    dispatch(setStatus({ runId, status: "executing" }));

    // ── 6. Set up task ids for streaming ─────────────────────────────────
    const taskId = uuidv4();
    const listenerId = taskId;
    dispatch(setCurrentTaskId({ runId, taskId }));

    dispatch(
      initializeTask({
        taskId,
        service: "chat_service",
        taskName: "agent_chat",
        connectionId: "fastapi",
      }),
    );
    dispatch(addResponse({ listenerId, taskId }));
    dispatch(setTaskListenerIds({ taskId, listenerIds: [listenerId] }));

    // ── 7. Build request ─────────────────────────────────────────────────
    const freshState = getState();
    const accessToken = selectAccessToken(freshState);
    const backendBaseUrl =
      selectResolvedBaseUrl(freshState as any) ?? BACKEND_URLS.production;

    const settings = agentRecord?.settings ?? {};

    const requestBody: Record<string, unknown> = {
      stream: true,
      messages: apiMessages,
      ai_model_id: instance.isVersion
        ? (agentRecord?.modelId ?? undefined)
        : (agentRecord?.modelId ?? undefined),
      ...(settings as Record<string, unknown>),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    // ── 8. Stream ────────────────────────────────────────────────────────
    const STALL_TIMEOUT_MS = 45_000;
    const stallController = new AbortController();
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    const resetStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        stallController.abort(
          new Error(
            `Stream stalled — no data received for ${STALL_TIMEOUT_MS / 1000}s.`,
          ),
        );
      }, STALL_TIMEOUT_MS);
    };
    const clearStall = () => {
      if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
    };

    let response: Response;
    try {
      resetStall();
      response = await fetch(`${backendBaseUrl}${ENDPOINTS.ai.chat}`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: stallController.signal,
        keepalive: true,
      });
      resetStall();
    } catch (networkError) {
      clearStall();
      const errMsg =
        networkError instanceof Error ? networkError.message : "Network error";
      dispatch(
        updateErrorResponse({
          listenerId,
          error: { message: errMsg, type: "network_error" },
        }),
      );
      dispatch(markResponseEnd(listenerId));
      dispatch(setTaskError({ taskId, error: errMsg }));
      dispatch(setExecutionError({ runId, error: errMsg }));
      return;
    }

    if (!response.ok) {
      clearStall();
      const apiError = await parseHttpError(response);
      dispatch(
        updateErrorResponse({
          listenerId,
          error: {
            message: apiError.detail,
            type: apiError.code,
            user_message: apiError.userMessage,
          },
        }),
      );
      dispatch(markResponseEnd(listenerId));
      dispatch(setTaskError({ taskId, error: apiError.userMessage }));
      dispatch(setExecutionError({ runId, error: apiError.userMessage }));
      return;
    }

    dispatch(setStatus({ runId, status: "streaming" }));

    const { events } = parseNdjsonStream(response, stallController.signal);
    let isFirstChunk = true;
    let fullText = "";

    try {
      for await (const event of events) {
        resetStall();
        if (event.event === "chunk") {
          if (isFirstChunk) {
            dispatch(setTaskStreaming({ taskId, isStreaming: true }));
            isFirstChunk = false;
          }
          const { text } = event.data as unknown as ChunkPayload;
          dispatch(appendTextChunk({ listenerId, text }));
          fullText += text;
        } else if (event.event === "error") {
          const errData = event.data as unknown as ErrorPayload;
          dispatch(
            updateErrorResponse({
              listenerId,
              error: {
                message: errData.message,
                type: errData.error_type,
                user_message: errData.user_message,
              },
            }),
          );
        }
      }
    } catch (streamError) {
      const errMsg =
        streamError instanceof Error ? streamError.message : "Stream error";
      dispatch(
        updateErrorResponse({
          listenerId,
          error: { message: errMsg, type: "stream_error" },
        }),
      );
    } finally {
      clearStall();
    }

    // ── 9. Finalize ──────────────────────────────────────────────────────
    dispatch(setTaskStreaming({ taskId, isStreaming: false }));
    dispatch(markResponseEnd(listenerId));
    dispatch(completeTask(taskId));
    dispatch(markStreamEnd({ runId }));

    if (fullText) {
      dispatch(
        addAssistantMessage({
          runId,
          content: fullText,
          taskId,
          metadata: { fromTemplate: false },
        }),
      );
    } else {
      dispatch(setStatus({ runId, status: "completed" }));
    }
  },
);
