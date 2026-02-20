/**
 * submitChatFastAPI — Drop-in replacement for createAndSubmitTask.
 *
 * Same signature, same return shape, dispatches to the same Redux slices.
 * Components can switch by changing ONE import.
 *
 * This thunk transforms the OLD socket payload shape (chat_config.model_id, etc.)
 * into the NEW /api/ai/chat/unified body shape (ai_model_id, etc.).
 *
 * Usage:
 *   // Before:
 *   import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
 *   // After:
 *   import { submitChatFastAPI as createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitChatFastAPI';
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState } from '../../store';
import { parseNdjsonStream } from '@/lib/api/stream-parser';
import { parseHttpError } from '@/lib/api/errors';
import { ENDPOINTS, BACKEND_URLS } from '@/lib/api/endpoints';
import type {
  ChunkPayload,
  ErrorPayload,
  ToolEventPayload,
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
} from '../slices/socketResponseSlice';

import {
  initializeTask,
  setTaskListenerIds,
  setTaskStreaming,
  completeTask,
  setTaskError,
} from '../slices/socketTasksSlice';

import { selectAccessToken, selectIsAdmin } from '../../slices/userSlice';

function selectIsUsingLocalhostSafe(state: RootState): boolean {
  const adminPrefs = (state as Record<string, unknown>).adminPreferences as
    | { serverOverride: string | null }
    | undefined;
  return adminPrefs?.serverOverride === 'localhost';
}

interface SubmitChatPayload {
  service: string;
  taskName: string;
  taskData: Record<string, unknown>;
  connectionId?: string;
  customTaskId?: string;
}

/**
 * Transforms a legacy socket-era chatConfig into the new /api/ai/chat/unified body.
 *
 * Renames:
 *   model_id      -> ai_model_id
 *   max_tokens    -> max_output_tokens
 *   output_format -> response_format
 *
 * Logs deprecation warnings for callers still passing old field names.
 */
function transformChatConfigToUnifiedBody(
  chatConfig: Record<string, unknown>,
  callerContext: string,
): Record<string, unknown> {
  const { model_id, max_tokens, output_format, messages, stream, ...rest } = chatConfig;

  const body: Record<string, unknown> = {
    messages,
    stream: stream ?? true,
    ...rest,
  };

  if (model_id !== undefined) {
    console.warn(
      `%c⚠️ FASTAPI MIGRATION [${callerContext}]: Caller is passing "model_id" — rename to "ai_model_id" at the source.`,
      'font-weight: bold; color: orange; font-size: 14px;',
    );
    body.ai_model_id = model_id;
  }

  if (max_tokens !== undefined) {
    console.warn(
      `%c⚠️ FASTAPI MIGRATION [${callerContext}]: Caller is passing "max_tokens" — rename to "max_output_tokens" at the source.`,
      'font-weight: bold; color: orange; font-size: 14px;',
    );
    body.max_output_tokens = max_tokens;
  }

  if (output_format !== undefined) {
    console.warn(
      `%c⚠️ FASTAPI MIGRATION [${callerContext}]: Caller is passing "output_format" — rename to "response_format" at the source.`,
      'font-weight: bold; color: orange; font-size: 14px;',
    );
    body.response_format = output_format;
  }

  return body;
}

export const submitChatFastAPI = createAsyncThunk<
  { taskId: string; submitResult: string[] },
  SubmitChatPayload,
  { state: RootState }
>(
  'socketTasks/submitChatFastAPI',
  async ({ service, taskName, taskData, customTaskId }, { dispatch, getState }) => {
    const state = getState();
    const accessToken = selectAccessToken(state);
    const isLocalhost = selectIsUsingLocalhostSafe(state);
    const isAdmin = selectIsAdmin(state);

    const BACKEND_URL = (isAdmin && isLocalhost)
      ? BACKEND_URLS.localhost
      : BACKEND_URLS.production;

    const taskId = customTaskId || uuidv4();
    const listenerId = taskId;
    const callerContext = `${service}.${taskName}`;

    console.warn(
      `%c🔄 FASTAPI MIGRATION [${callerContext}]: This call flows through submitChatFastAPI → /api/ai/chat/unified. ` +
      `The calling component should be updated to call the unified API directly and pass the new field names (ai_model_id, max_output_tokens, response_format). ` +
      `This bridge thunk will be removed once all callers are updated.`,
      'font-weight: bold; color: #ff9800; font-size: 12px;',
    );

    dispatch(initializeTask({
      taskId,
      service,
      taskName,
      connectionId: 'fastapi',
    }));
    dispatch(addResponse({ listenerId, taskId }));
    dispatch(setTaskListenerIds({ taskId, listenerIds: [listenerId] }));

    const chatConfig = (taskData as { chat_config?: Record<string, unknown> }).chat_config || taskData;
    const requestBody = transformChatConfigToUnifiedBody(
      chatConfig as Record<string, unknown>,
      callerContext,
    );

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
              toolUpdate: toolData as unknown as import('../socket.types').ToolCallObject,
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

          case 'completion':
          case 'heartbeat':
          case 'end':
            break;
        }
      }
    } catch (streamError) {
      if (streamError instanceof Error && streamError.name !== 'AbortError') {
        const errMsg = streamError.message;
        dispatch(updateErrorResponse({
          listenerId,
          error: { message: errMsg, type: 'stream_error' },
        }));
      }
    }

    dispatch(setTaskStreaming({ taskId, isStreaming: false }));
    dispatch(markResponseEnd(listenerId));
    dispatch(completeTask(taskId));

    return { taskId, submitResult: [listenerId] };
  }
);
