/**
 * submitAppletAgentThunk
 *
 * Executes a custom applet via the FastAPI agent endpoint.
 * Replaces the Socket.IO `run_recipe_to_chat` path when ?fx=1 is active.
 *
 * Flow:
 *   1. useAppletRecipeFastAPI converts the recipe → agentId (once, then cached)
 *   2. This thunk calls POST /api/ai/agents/{agentId} with broker values as variables
 *   3. Parses NDJSON stream → dispatches to the same socketResponseSlice used by all other paths
 *   4. ResponseLayoutManager reads taskId as normal — no rendering changes needed
 *
 * Future extensions (not yet implemented):
 *   - user_input: pass a non-empty string when applets support a primary text input
 *   - conversationContinue: use the conversation_id from X-Conversation-ID header
 *     to hit POST /api/ai/conversations/{id} for follow-up turns on the same page
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
    StatusUpdatePayload,
    StreamEvent,
} from '@/types/python-generated/stream-events';

import {
    addResponse,
    appendTextChunk,
    updateDataResponse,
    updateInfoResponse,
    updateErrorResponse,
    appendRawToolEvent,
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

export interface SubmitAppletAgentPayload {
    /** The agent/prompt ID returned by convert_compiled_recipe_to_prompt */
    agentId: string;
    /**
     * Broker values mapped to variable names.
     * Keys are broker names (e.g. "job_description"), values are the user-entered strings.
     */
    variables: Record<string, unknown>;
    /**
     * Optional user input string. Defaults to empty string — the agent API does not
     * require user_input when variables carry all the content.
     * Future: allow applets to designate a primary text input broker for this field.
     */
    userInput?: string;
    /** Pre-allocated taskId from the hook so ResponseLayoutManager can start reading immediately */
    taskId: string;
}

export const submitAppletAgentThunk = createAsyncThunk<
    { taskId: string; listenerId: string; conversationId: string | null },
    SubmitAppletAgentPayload,
    { state: RootState }
>(
    'socketTasks/submitAppletAgent',
    async ({ agentId, variables, userInput = '', taskId }, { dispatch, getState }) => {
        const state = getState();
        const accessToken = selectAccessToken(state);
        const isLocalhost = selectIsUsingLocalhost(state);
        const isAdmin = selectIsAdmin(state);

        const BACKEND_URL = (isAdmin && isLocalhost)
            ? BACKEND_URLS.localhost
            : BACKEND_URLS.production;

        const listenerId = taskId;

        console.log(
            `[submitAppletAgentThunk] agentId=${agentId}, isAdmin=${isAdmin}, isLocalhost=${isLocalhost}, BACKEND_URL=${BACKEND_URL}`,
        );

        dispatch(initializeTask({
            taskId,
            service: 'applet_agent',
            taskName: 'run_applet_agent',
            connectionId: 'fastapi',
        }));
        dispatch(addResponse({ listenerId, taskId }));
        dispatch(setTaskListenerIds({ taskId, listenerIds: [listenerId] }));

        const requestBody: Record<string, unknown> = {
            user_input: userInput,
            stream: true,
        };

        if (Object.keys(variables).length > 0) {
            requestBody.variables = variables;
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        console.log(
            '[submitAppletAgentThunk] Request body:', JSON.stringify(requestBody, null, 2),
        );

        let response: Response;
        const endpoint = `${BACKEND_URL}${ENDPOINTS.ai.agentStart(agentId)}`;

        try {
            response = await fetch(endpoint, {
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
                `[submitAppletAgentThunk] HTTP ${response.status} from ${endpoint}`,
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

        // Extract conversation ID from response headers for future follow-up turns.
        // The hook stores this so the applet can later continue the conversation.
        const { events, conversationId: headerConvId } = parseNdjsonStream(response);
        let resolvedConversationId: string | null = headerConvId ?? null;

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
                        dispatch(appendRawToolEvent({ listenerId, event: event as StreamEvent }));
                        break;
                    }

                    case 'data': {
                        const dataPayload = event.data as unknown as Record<string, unknown>;
                        // Capture conversation_id from data events as a fallback to the header
                        if (dataPayload.event === 'conversation_id' && dataPayload.conversation_id) {
                            resolvedConversationId = dataPayload.conversation_id as string;
                        }
                        dispatch(updateDataResponse({ listenerId, data: event.data }));
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

        return { taskId, listenerId, conversationId: resolvedConversationId };
    },
);
