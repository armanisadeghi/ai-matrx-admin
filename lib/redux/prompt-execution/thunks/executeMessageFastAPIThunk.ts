/**
 * FastAPI Bridge Thunk — Drop-in replacement for the socket.io path in executeMessage.
 *
 * Calls /api/ai/chat/unified via fetch + NDJSON streaming, then dispatches
 * to the SAME Redux slices that the socket path uses. All existing selectors,
 * components, and UI continue to work unchanged.
 *
 * This thunk transforms legacy chatConfig (model_id, max_tokens, output_format)
 * into the new unified API body (ai_model_id, max_output_tokens, response_format).
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
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

function selectIsUsingLocalhostSafe(state: RootState): boolean {
  const adminPrefs = (state as Record<string, unknown>).adminPreferences as
    | { serverOverride: string | null }
    | undefined;
  return adminPrefs?.serverOverride === 'localhost';
}

interface ExecuteMessageFastAPIPayload {
  chatConfig: {
    model_id: string;
    messages: Array<{ role: string; content: string }>;
    stream: boolean;
    [key: string]: unknown;
  };
  taskId: string;
  runId: string;
}

export const executeMessageFastAPI = createAsyncThunk<
  string,
  ExecuteMessageFastAPIPayload,
  { dispatch: AppDispatch; state: RootState }
>(
  'promptExecution/executeMessageFastAPI',
  async ({ chatConfig, taskId, runId }, { dispatch, getState }) => {
    const state = getState();
    const accessToken = selectAccessToken(state);
    const isLocalhost = selectIsUsingLocalhostSafe(state);
    const isAdmin = selectIsAdmin(state);

    const BACKEND_URL = (isAdmin && isLocalhost)
      ? BACKEND_URLS.localhost
      : BACKEND_URLS.production;

    const listenerId = taskId;

    dispatch(initializeTask({
      taskId,
      service: 'chat_service',
      taskName: 'direct_chat',
      connectionId: 'fastapi',
    }));
    dispatch(addResponse({ listenerId, taskId }));
    dispatch(setTaskListenerIds({ taskId, listenerIds: [listenerId] }));

    const { model_id, messages, stream, max_tokens, output_format, ...restConfig } = chatConfig;

    if (model_id !== undefined) {
      console.warn(
        '%c⚠️ FASTAPI MIGRATION [executeMessageFastAPI]: chatConfig uses "model_id" — the calling code (executeMessageThunk / promptExecution slice) should be updated to pass "ai_model_id".',
        'font-weight: bold; color: orange; font-size: 14px;',
      );
    }
    if (max_tokens !== undefined) {
      console.warn(
        '%c⚠️ FASTAPI MIGRATION [executeMessageFastAPI]: chatConfig uses "max_tokens" — rename to "max_output_tokens" in the prompt settings source.',
        'font-weight: bold; color: orange; font-size: 14px;',
      );
    }
    if (output_format !== undefined) {
      console.warn(
        '%c⚠️ FASTAPI MIGRATION [executeMessageFastAPI]: chatConfig uses "output_format" — rename to "response_format" in the prompt settings source.',
        'font-weight: bold; color: orange; font-size: 14px;',
      );
    }

    const requestBody: Record<string, unknown> = {
      messages,
      ai_model_id: model_id,
      stream: true,
      is_new_conversation: false,
      ...restConfig,
    };

    if (max_tokens !== undefined) {
      requestBody.max_output_tokens = max_tokens;
      delete requestBody.max_tokens;
    }
    if (output_format !== undefined) {
      requestBody.response_format = output_format;
      delete requestBody.output_format;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}${ENDPOINTS.ai.chatUnified}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (networkError) {
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

    const { events } = parseNdjsonStream(response);
    let isFirstChunk = true;

    try {
      for await (const event of events) {
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
        // User cancelled
      } else {
        const errMsg = streamError instanceof Error ? streamError.message : 'Stream error';
        dispatch(updateErrorResponse({
          listenerId,
          error: { message: errMsg, type: 'stream_error' },
        }));
      }
    }

    dispatch(setTaskStreaming({ taskId, isStreaming: false }));
    dispatch(markResponseEnd(listenerId));
    dispatch(completeTask(taskId));

    return taskId;
  }
);
