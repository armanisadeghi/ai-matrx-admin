/**
 * submitChatFastAPI — Drop-in replacement for createAndSubmitTask.
 *
 * Same signature, same return shape, dispatches to the same Redux slices.
 * Components can switch by changing ONE import.
 *
 * This thunk transforms the OLD socket payload shape (chat_config.model_id, etc.)
 * into the NEW POST /api/ai/conversations/{conversationId}/chat body shape (ai_model_id, etc.).
 * A UUID conversation ID is generated client-side per turn (or reused via customTaskId).
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
import { selectIsUsingLocalhost } from '../../slices/adminPreferencesSlice';

interface SubmitChatPayload {
  service: string;
  taskName: string;
  taskData: Record<string, unknown>;
  connectionId?: string;
  customTaskId?: string;
}

/**
 * Fields the POST /api/ai/conversations/{id}/chat endpoint actually accepts.
 * Anything NOT in this set is stripped from the request to prevent 422 errors.
 * conversation_id and is_new_conversation are no longer body fields — they were removed.
 */
const UNIFIED_API_ALLOWED_FIELDS = new Set([
  'ai_model_id',
  'messages',
  'stream',
  'debug',
  'max_iterations',
  'max_retries_per_iteration',
  'system_instruction',
  'max_output_tokens',
  'temperature',
  'top_p',
  'top_k',
  'tools',
  'tool_choice',
  'parallel_tool_calls',
  'reasoning_effort',
  'reasoning_summary',
  'thinking_level',
  'include_thoughts',
  'thinking_budget',
  'response_format',
  'stop_sequences',
  'internal_web_search',
  'internal_url_context',
  'store',
  'metadata',
]);

/**
 * The backend expects response_format as Dict[str, Any] | null.
 * The old frontend sends it as a bare string like "text" or "json_object".
 * This converts string values to the proper dict format or strips them if
 * they represent the default behavior (no need to send "text").
 */
function normalizeResponseFormat(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null) return null;

  // Already a dict — pass through
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    // "text" is the default — no need to send it at all
    if (value === 'text' || value === '') return null;
    // Convert known string shorthand to proper dict
    return { type: value };
  }

  return null;
}

/**
 * Transforms a legacy socket-era chatConfig into the new POST /api/ai/conversations/{id}/chat body.
 *
 * 1. Renames old fields to new names
 * 2. Strips frontend-only fields the backend doesn't accept (image_urls, file_urls, etc.)
 * 3. Strips conversation_id and is_new_conversation (no longer body fields — moved to URL path)
 * 4. Normalizes response_format from string -> dict
 * 5. Logs deprecation warnings for old field names
 */
function transformChatConfigToUnifiedBody(
  chatConfig: Record<string, unknown>,
  callerContext: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  body.messages = chatConfig.messages;
  body.stream = chatConfig.stream ?? true;

  // Rename model_id -> ai_model_id
  if (chatConfig.model_id !== undefined) {
    console.warn(
      `%c⚠️ FASTAPI MIGRATION [${callerContext}]: Caller is passing "model_id" — rename to "ai_model_id" at the source.`,
      'font-weight: bold; color: orange; font-size: 14px;',
    );
    body.ai_model_id = chatConfig.model_id;
  } else if (chatConfig.ai_model_id !== undefined) {
    body.ai_model_id = chatConfig.ai_model_id;
  }

  // Rename max_tokens -> max_output_tokens
  if (chatConfig.max_tokens !== undefined) {
    console.warn(
      `%c⚠️ FASTAPI MIGRATION [${callerContext}]: Caller is passing "max_tokens" — rename to "max_output_tokens" at the source.`,
      'font-weight: bold; color: orange; font-size: 14px;',
    );
    body.max_output_tokens = chatConfig.max_tokens;
  }

  // Rename output_format -> response_format AND normalize string -> dict
  const rawFormat = chatConfig.output_format ?? chatConfig.response_format;
  if (rawFormat !== undefined) {
    if (chatConfig.output_format !== undefined) {
      console.warn(
        `%c⚠️ FASTAPI MIGRATION [${callerContext}]: Caller is passing "output_format" — rename to "response_format" at the source.`,
        'font-weight: bold; color: orange; font-size: 14px;',
      );
    }
    const normalized = normalizeResponseFormat(rawFormat);
    if (normalized !== null) {
      body.response_format = normalized;
    }
  }

  // Copy all other allowed fields directly.
  // conversation_id and is_new_conversation must not be sent in the body — they are gone.
  const skipFields = new Set([
    'messages', 'stream', 'model_id', 'ai_model_id', 'max_tokens',
    'output_format', 'response_format', 'conversation_id', 'is_new_conversation',
  ]);
  const droppedFields: string[] = [];

  for (const [key, value] of Object.entries(chatConfig)) {
    if (skipFields.has(key)) continue;
    if (value === undefined || value === null) continue;

    if (UNIFIED_API_ALLOWED_FIELDS.has(key)) {
      body[key] = value;
    } else {
      droppedFields.push(key);
    }
  }

  if (droppedFields.length > 0) {
    console.warn(
      `%c⚠️ FASTAPI MIGRATION [${callerContext}]: Stripped ${droppedFields.length} fields not accepted by /api/ai/conversations/{id}/chat: ${droppedFields.join(', ')}`,
      'font-weight: bold; color: #ff9800; font-size: 12px;',
    );
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
    const isLocalhost = selectIsUsingLocalhost(state);
    const isAdmin = selectIsAdmin(state);

    const BACKEND_URL = (isAdmin && isLocalhost)
      ? BACKEND_URLS.localhost
      : BACKEND_URLS.production;

    const taskId = customTaskId || uuidv4();
    const listenerId = taskId;
    const callerContext = `${service}.${taskName}`;

    console.log(
      `[submitChatFastAPI] isAdmin=${isAdmin}, isLocalhost=${isLocalhost}, BACKEND_URL=${BACKEND_URL}`,
    );

    console.warn(
      `%c🔄 FASTAPI MIGRATION [${callerContext}]: This call flows through submitChatFastAPI → POST /api/ai/conversations/{id}/chat. ` +
      `The calling component should be updated to call the conversation API directly and pass the new field names (ai_model_id, max_output_tokens, response_format). ` +
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

    console.log(
      '[submitChatFastAPI] Final request body keys:', Object.keys(requestBody),
      '\n[submitChatFastAPI] Full body:', JSON.stringify(requestBody, null, 2),
    );

    let response: Response;
    try {
      response = await fetch(`${BACKEND_URL}${ENDPOINTS.ai.chat(taskId)}`, {
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
      let rawErrorBody: string | undefined;
      try {
        rawErrorBody = await response.clone().text();
      } catch { /* ignore */ }
      console.error(
        `[submitChatFastAPI] HTTP ${response.status} from ${BACKEND_URL}${ENDPOINTS.ai.chat(taskId)}`,
        '\nResponse body:', rawErrorBody,
      );

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
