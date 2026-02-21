/**
 * FastAPI Bridge Thunk — Drop-in replacement for the socket.io path in executeMessage.
 *
 * Calls POST /api/ai/conversations/chat via fetch + NDJSON streaming,
 * then dispatches to the SAME Redux slices that the socket path uses. All existing
 * selectors, components, and UI continue to work unchanged.
 *
 * This thunk transforms legacy chatConfig (model_id, max_tokens, output_format)
 * into the new unified API body (ai_model_id, max_output_tokens, response_format).
 * Pass conversation_id in chatConfig to continue an existing conversation.
 * Omit for a new conversation — the server streams it back.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '../../store';
import { parseNdjsonStream } from '@/lib/api/stream-parser';
import { parseHttpError } from '@/lib/api/errors';
import { ENDPOINTS, BACKEND_URLS } from '@/lib/api/endpoints';
import type {
  ChunkPayload,
  ErrorPayload,
  ToolEventPayload,
  BrokerPayload,
  CompletionPayload,
  StatusUpdatePayload,
} from '@/types/python-generated/stream-events';

import {
  addResponse,
  appendTextChunk,
  updateDataResponse,
  updateInfoResponse,
  updateErrorResponse,
  updateToolUpdateResponse,
  markResponseEnd,
} from '../../socket-io/slices/socketResponseSlice';

import {
  initializeTask,
  setTaskListenerIds,
  setTaskStreaming,
  completeTask,
  setTaskError,
} from '../../socket-io/slices/socketTasksSlice';

import { brokerActions } from '../../brokerSlice/slice';
import { selectAccessToken, selectIsAdmin } from '../../slices/userSlice';
import { selectIsUsingLocalhost } from '../../slices/adminPreferencesSlice';

interface ExecuteMessageFastAPIPayload {
  chatConfig: {
    model_id: string;
    messages: Array<{ role: string; content: string }>;
    stream: boolean;
    [key: string]: unknown;
  };
  taskId: string;
  runId: string;
  /** Client-generated UUID for the conversation. Generated here if not provided. */
  conversationId?: string;
  /**
   * External AbortSignal — callers can pass their own controller to cancel the
   * fetch early (e.g. when a stall is detected by the polling loop above).
   */
  signal?: AbortSignal;
}

export const executeMessageFastAPI = createAsyncThunk<
  string,
  ExecuteMessageFastAPIPayload,
  { dispatch: AppDispatch; state: RootState }
>(
  'promptExecution/executeMessageFastAPI',
  async ({ chatConfig, taskId, runId, conversationId: providedConversationId, signal: externalSignal }, { dispatch, getState }) => {
    const conversationId = providedConversationId || uuidv4();
    const state = getState();
    const accessToken = selectAccessToken(state);
    const isLocalhost = selectIsUsingLocalhost(state);
    const isAdmin = selectIsAdmin(state);

    const BACKEND_URL = (isAdmin && isLocalhost)
      ? BACKEND_URLS.localhost
      : BACKEND_URLS.production;

    console.log(
      `[executeMessageFastAPI] isAdmin=${isAdmin}, isLocalhost=${isLocalhost}, BACKEND_URL=${BACKEND_URL}`,
    );

    const listenerId = taskId;

    dispatch(initializeTask({
      taskId,
      service: 'chat_service',
      taskName: 'direct_chat',
      connectionId: 'fastapi',
    }));
    dispatch(addResponse({ listenerId, taskId }));
    dispatch(setTaskListenerIds({ taskId, listenerIds: [listenerId] }));

    // Fields accepted by POST /api/ai/conversations/chat — anything else gets stripped.
    // conversation_id is optional in the body: omit for new conversations, include for existing.
    // is_new_conversation has been removed entirely from the API.
    const ALLOWED_FIELDS = new Set([
      'ai_model_id', 'messages', 'conversation_id', 'stream', 'debug', 'max_iterations',
      'max_retries_per_iteration', 'system_instruction', 'max_output_tokens',
      'temperature', 'top_p', 'top_k', 'tools', 'tool_choice',
      'parallel_tool_calls', 'reasoning_effort', 'reasoning_summary',
      'thinking_level', 'include_thoughts', 'thinking_budget',
      'response_format', 'stop_sequences', 'internal_web_search',
      'internal_url_context', 'store', 'metadata',
    ]);

    const requestBody: Record<string, unknown> = {
      stream: true,
    };

    // Rename model_id -> ai_model_id
    if (chatConfig.model_id !== undefined) {
      console.warn(
        '%c⚠️ FASTAPI MIGRATION [executeMessageFastAPI]: chatConfig uses "model_id" — the calling code should pass "ai_model_id".',
        'font-weight: bold; color: orange; font-size: 14px;',
      );
      requestBody.ai_model_id = chatConfig.model_id;
    } else if (chatConfig.ai_model_id !== undefined) {
      requestBody.ai_model_id = chatConfig.ai_model_id;
    }

    // Rename max_tokens -> max_output_tokens
    if (chatConfig.max_tokens !== undefined) {
      console.warn(
        '%c⚠️ FASTAPI MIGRATION [executeMessageFastAPI]: chatConfig uses "max_tokens" — rename to "max_output_tokens".',
        'font-weight: bold; color: orange; font-size: 14px;',
      );
      requestBody.max_output_tokens = chatConfig.max_tokens;
    }

    // Rename output_format -> response_format AND normalize string -> dict
    const rawFormat = chatConfig.output_format ?? chatConfig.response_format;
    if (rawFormat !== undefined) {
      if (chatConfig.output_format !== undefined) {
        console.warn(
          '%c⚠️ FASTAPI MIGRATION [executeMessageFastAPI]: chatConfig uses "output_format" — rename to "response_format".',
          'font-weight: bold; color: orange; font-size: 14px;',
        );
      }
      // Backend expects Dict[str, Any] | null, not a bare string
      if (typeof rawFormat === 'string') {
        if (rawFormat !== 'text' && rawFormat !== '') {
          requestBody.response_format = { type: rawFormat };
        }
        // "text" is the default — omit entirely
      } else if (rawFormat !== null && typeof rawFormat === 'object') {
        requestBody.response_format = rawFormat;
      }
    }

    // Copy remaining allowed fields, strip everything else.
    // conversation_id is now allowed in the body (optional). is_new_conversation is gone.
    const skipFields = new Set(['model_id', 'ai_model_id', 'max_tokens', 'output_format', 'response_format', 'stream', 'is_new_conversation']);
    const droppedFields: string[] = [];

    for (const [key, value] of Object.entries(chatConfig)) {
      if (skipFields.has(key)) continue;
      if (value === undefined || value === null) continue;
      if (ALLOWED_FIELDS.has(key)) {
        requestBody[key] = value;
      } else {
        droppedFields.push(key);
      }
    }

    if (droppedFields.length > 0) {
      console.warn(
        `%c⚠️ FASTAPI MIGRATION [executeMessageFastAPI]: Stripped ${droppedFields.length} fields not accepted by /api/ai/conversations/chat: ${droppedFields.join(', ')}`,
        'font-weight: bold; color: #ff9800; font-size: 12px;',
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // --- Abort / stall detection setup ---
    // We use two signals merged together:
    //   1. externalSignal  — caller-supplied (e.g. from the polling loop above)
    //   2. stall controller — aborts after STALL_TIMEOUT_MS with no new bytes
    //
    // Browser tabs that go to background can suspend ReadableStream reads
    // without throwing any error, causing the stream to hang silently forever.
    // The stall detector resets every time a chunk arrives; if it fires, we
    // abort the fetch and surface a clear error.
    const STALL_TIMEOUT_MS = 45_000; // 45s without any chunk = consider it dead
    const stallController = new AbortController();

    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    const resetStallTimer = () => {
      if (stallTimer !== null) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        const hiddenSuffix =
          typeof document !== 'undefined' && document.visibilityState === 'hidden'
            ? ' The browser tab was in the background, which likely caused the stream to be suspended.'
            : '';
        stallController.abort(
          new Error(
            `Stream stalled — no data received for ${STALL_TIMEOUT_MS / 1000} seconds.${hiddenSuffix} Please keep this tab active and try again.`,
          ),
        );
      }, STALL_TIMEOUT_MS);
    };
    const clearStallTimer = () => {
      if (stallTimer !== null) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
    };

    // Merge external signal + stall signal into one
    const mergedController = new AbortController();
    const forwardAbort = () => mergedController.abort(stallController.signal.reason);
    stallController.signal.addEventListener('abort', forwardAbort);
    externalSignal?.addEventListener('abort', () => mergedController.abort(externalSignal.reason));
    // If the merged controller itself is already aborted (edge case), propagate
    if (externalSignal?.aborted) mergedController.abort(externalSignal.reason);

    let response: Response;
    try {
      resetStallTimer(); // start the stall clock before the initial request
      response = await fetch(`${BACKEND_URL}${ENDPOINTS.ai.chat}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: mergedController.signal,
        // keepalive keeps the connection alive even when the tab is backgrounded
        keepalive: true,
      });
      resetStallTimer(); // reset after headers arrive, stream hasn't started yet
    } catch (networkError) {
      clearStallTimer();
      stallController.signal.removeEventListener('abort', forwardAbort);
      const errMsg = networkError instanceof Error ? networkError.message : 'Network error';
      dispatch(updateErrorResponse({
        listenerId,
        error: { message: errMsg, type: 'network_error' },
      }));
      dispatch(markResponseEnd(listenerId));
      dispatch(setTaskError({ taskId, error: errMsg }));
      throw new Error(errMsg);
    }

    if (!response.ok) {
      clearStallTimer();
      stallController.signal.removeEventListener('abort', forwardAbort);
      const apiError = await parseHttpError(response);
      dispatch(updateErrorResponse({
        listenerId,
        error: {
          message: apiError.detail,
          type: apiError.code,
          user_message: apiError.userMessage,
        },
      }));
      dispatch(markResponseEnd(listenerId));
      dispatch(setTaskError({ taskId, error: apiError.userMessage }));
      throw apiError;
    }

    const { events } = parseNdjsonStream(response, mergedController.signal);
    let isFirstChunk = true;

    try {
      for await (const event of events) {
        // Any incoming event proves the stream is alive — reset the stall clock
        resetStallTimer();
        switch (event.event) {
          case 'chunk': {
            if (isFirstChunk) {
              dispatch(setTaskStreaming({ taskId, isStreaming: true }));
              isFirstChunk = false;
            }
            const { text } = event.data as unknown as ChunkPayload;
            dispatch(appendTextChunk({ listenerId, text }));
            break;
          }

          case 'status_update': {
            const statusData = event.data as unknown as StatusUpdatePayload;
            dispatch(updateInfoResponse({
              listenerId,
              info: {
                status: statusData.status === 'complete' ? 'confirm' : 'processing',
                system_message: statusData.system_message || statusData.status,
                user_message: statusData.user_message || undefined,
                metadata: statusData.metadata,
              },
            }));
            break;
          }

          case 'tool_event': {
            const toolData = event.data as unknown as ToolEventPayload;
            dispatch(updateToolUpdateResponse({
              listenerId,
              toolUpdate: toolData as unknown as import('../../socket-io/socket.types').ToolCallObject,
            }));
            break;
          }

          case 'error': {
            const errData = event.data as unknown as ErrorPayload;
            dispatch(updateErrorResponse({
              listenerId,
              error: {
                message: errData.message,
                type: errData.error_type,
                user_message: errData.user_message,
                code: errData.code || undefined,
                details: errData.details,
              },
            }));
            break;
          }

          case 'data': {
            dispatch(updateDataResponse({
              listenerId,
              data: event.data,
            }));
            break;
          }

          case 'broker': {
            const brokerData = event.data as unknown as BrokerPayload;
            if (brokerData.broker_id && brokerData.value !== undefined) {
              dispatch(brokerActions.addOrUpdateRegisterEntry({
                brokerId: brokerData.broker_id,
                mappedItemId: brokerData.broker_id,
                source: brokerData.source || 'fastapi-stream',
                sourceId: brokerData.source_id || listenerId,
              }));
              dispatch(brokerActions.setValue({
                brokerId: brokerData.broker_id,
                value: brokerData.value,
              }));
            }
            break;
          }

          case 'completion': {
            void (event.data as unknown as CompletionPayload);
            break;
          }

          case 'heartbeat':
          case 'end':
            break;
        }
      }
    } catch (streamError) {
      if (streamError instanceof Error && streamError.name === 'AbortError') {
        // Stall-triggered abort or external cancel — surface the reason as an error
        const reason = stallController.signal.reason ?? externalSignal?.reason;
        const errMsg =
          reason instanceof Error
            ? reason.message
            : typeof reason === 'string'
            ? reason
            : 'Stream was aborted';
        dispatch(updateErrorResponse({
          listenerId,
          error: { message: errMsg, type: 'stream_stall' },
        }));
      } else {
        const errMsg = streamError instanceof Error ? streamError.message : 'Stream error';
        dispatch(updateErrorResponse({
          listenerId,
          error: { message: errMsg, type: 'stream_error' },
        }));
      }
    } finally {
      clearStallTimer();
      stallController.signal.removeEventListener('abort', forwardAbort);
    }

    dispatch(setTaskStreaming({ taskId, isStreaming: false }));
    dispatch(markResponseEnd(listenerId));
    dispatch(completeTask(taskId));

    return taskId;
  }
);
