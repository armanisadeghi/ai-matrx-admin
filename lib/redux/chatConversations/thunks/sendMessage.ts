/**
 * sendMessage thunk — Unified NDJSON streaming for chatConversations slice
 *
 * Routes to one of three API patterns based on session.apiMode:
 *
 *   agent mode (default):
 *     - POST /agents/{agentId}              — first message (new conversation)
 *     - POST /conversations/{conversationId} — follow-up messages (auto-switches)
 *
 *   conversation mode:
 *     - POST /conversations/{conversationId} — always (requires pre-existing conversationId)
 *
 *   chat mode:
 *     - POST /api/ai/chat                   — always (client sends full history each time)
 *
 * All modes stream NDJSON events directly into chatConversationsSlice.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '../../store';
import { parseNdjsonStream } from '@/lib/api/stream-parser';
import { ENDPOINTS, BACKEND_URLS } from '@/lib/api/endpoints';
import { extractPersistableToolBlocks, toolCallBlockToLegacy } from '@/lib/chat-protocol';
import type {
    ChunkPayload,
    ErrorPayload,
} from '@/types/python-generated/stream-events';
import type { StreamEvent } from '@/types/python-generated/stream-events';
import { chatConversationsActions } from '../slice';
import { selectConversationId, selectUIState, selectMessages } from '../selectors';
import { selectAccessToken, selectIsAdmin } from '../../slices/userSlice';
import { selectIsUsingLocalhost } from '../../slices/adminPreferencesSlice';
import type { ConversationResource, ChatModeConfig, ConversationMessage } from '../types';

export interface SendMessagePayload {
    sessionId: string;
    agentId: string;
    content: string;
    resources?: ConversationResource[];
    variables?: Record<string, unknown>;
    signal?: AbortSignal;
}

// ============================================================================
// ENDPOINT BUILDERS — one per API mode
// ============================================================================

function buildAgentRequest(
    backendUrl: string,
    agentId: string,
    existingConversationId: string | null,
    content: string,
    variables: Record<string, unknown>,
    configOverrides: Record<string, unknown>,
    blockMode: boolean,
): { url: string; body: Record<string, unknown> } {
    if (existingConversationId) {
        return {
            url: `${backendUrl}${ENDPOINTS.ai.conversationContinue(existingConversationId)}`,
            body: {
                user_input: content,
                stream: true,
                debug: true,
            },
        };
    }
    const startEndpoint = blockMode
        ? ENDPOINTS.ai.agentBlocksStart(agentId)
        : ENDPOINTS.ai.agentStart(agentId);
    return {
        url: `${backendUrl}${startEndpoint}`,
        body: {
            user_input: content,
            variables: Object.keys(variables).length > 0 ? variables : undefined,
            config_overrides: Object.keys(configOverrides).length > 0 ? configOverrides : undefined,
            stream: true,
            debug: true,
        },
    };
}

function buildConversationRequest(
    backendUrl: string,
    conversationId: string,
    content: string,
): { url: string; body: Record<string, unknown> } {
    return {
        url: `${backendUrl}${ENDPOINTS.ai.conversationContinue(conversationId)}`,
        body: {
            user_input: content,
            stream: true,
            debug: true,
        },
    };
}

function buildChatRequest(
    backendUrl: string,
    messages: ConversationMessage[],
    newContent: string,
    chatConfig: ChatModeConfig,
    configOverrides: Record<string, unknown>,
): { url: string; body: Record<string, unknown> } {
    // Build the full message history for the chat endpoint
    const chatMessages = messages
        .filter(m => m.status !== 'error')
        .map(m => ({ role: m.role, content: m.content }));

    // Add the new user message
    chatMessages.push({ role: 'user', content: newContent });

    const body: Record<string, unknown> = {
        messages: chatMessages,
        ai_model_id: configOverrides.ai_model_id ?? chatConfig.aiModelId,
        stream: true,
        debug: true,
    };

    // Spread optional chat config
    if (chatConfig.systemInstruction) body.system_instruction = chatConfig.systemInstruction;
    if (chatConfig.temperature != null) body.temperature = chatConfig.temperature;
    if (chatConfig.maxOutputTokens != null) body.max_output_tokens = chatConfig.maxOutputTokens;
    if (chatConfig.topP != null) body.top_p = chatConfig.topP;
    if (chatConfig.topK != null) body.top_k = chatConfig.topK;
    if (chatConfig.tools) body.tools = chatConfig.tools;
    if (chatConfig.toolChoice) body.tool_choice = chatConfig.toolChoice;
    if (chatConfig.parallelToolCalls != null) body.parallel_tool_calls = chatConfig.parallelToolCalls;
    if (chatConfig.responseFormat !== undefined) body.response_format = chatConfig.responseFormat;
    if (chatConfig.internalWebSearch) body.internal_web_search = chatConfig.internalWebSearch;
    if (chatConfig.internalUrlContext) body.internal_url_context = chatConfig.internalUrlContext;
    if (chatConfig.reasoningEffort) body.reasoning_effort = chatConfig.reasoningEffort;
    if (chatConfig.thinkingBudget != null) body.thinking_budget = chatConfig.thinkingBudget;
    if (chatConfig.includeThoughts != null) body.include_thoughts = chatConfig.includeThoughts;
    if (chatConfig.extraConfig) Object.assign(body, chatConfig.extraConfig);

    return {
        url: `${backendUrl}${ENDPOINTS.ai.chat}`,
        body,
    };
}

// ============================================================================
// THUNK
// ============================================================================

export const sendMessage = createAsyncThunk<
    void,
    SendMessagePayload,
    { dispatch: AppDispatch; state: RootState }
>(
    'chatConversations/sendMessage',
    async ({ sessionId, agentId, content, resources = [], variables = {}, signal: externalSignal }, { dispatch, getState }) => {
        const state = getState();
        const session = state.chatConversations.sessions[sessionId];
        const apiMode = session?.apiMode ?? 'agent';
        const chatModeConfig = session?.chatModeConfig ?? null;
        const existingConversationId = selectConversationId(state, sessionId);
        const uiState = selectUIState(state, sessionId);
        const accessToken = selectAccessToken(state);
        const isLocalhost = selectIsUsingLocalhost(state);
        const isAdmin = selectIsAdmin(state);

        // ── Build headers ──────────────────────────────────────────────────────
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // ── Backend URL ────────────────────────────────────────────────────────
        const backendUrl = isAdmin && isLocalhost ? BACKEND_URLS.localhost : BACKEND_URLS.production;

        // ── Config overrides (model, etc.) ────────────────────────────────────
        const configOverrides: Record<string, unknown> = {};
        if (uiState.modelOverride) {
            configOverrides.ai_model_id = uiState.modelOverride;
        }

        // ── Build user message in Redux ──────────────────────────────────────
        const userMessageId = uuidv4();
        dispatch(chatConversationsActions.addMessage({
            sessionId,
            message: {
                id: userMessageId,
                role: 'user',
                content,
                status: 'complete',
                resources: resources.length > 0 ? resources : undefined,
            },
        }));

        // ── Create pending assistant message ──────────────────────────────────
        const assistantMessageId = uuidv4();
        dispatch(chatConversationsActions.addMessage({
            sessionId,
            message: {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                status: 'pending',
            },
        }));

        dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'executing' }));

        const blockMode = isAdmin && uiState.useBlockMode;
        const internalController = new AbortController();
        const combinedSignal = externalSignal
            ? AbortSignal.any ? AbortSignal.any([externalSignal, internalController.signal]) : internalController.signal
            : internalController.signal;

        let serverRequestId: string | null = null;

        try {
            // ── Choose endpoint based on apiMode ───────────────────────────────
            let url: string;
            let body: Record<string, unknown>;

            switch (apiMode) {
                case 'chat': {
                    if (!chatModeConfig) {
                        throw new Error('Chat mode requires chatModeConfig on the session');
                    }
                    // For chat mode, get current messages BEFORE the user message we just added
                    // (the thunk already added the user message to Redux, but we need the state
                    // from before that for the API call — however since we're in the same tick,
                    // we re-read from the updated state which now includes the user message)
                    const currentMessages = selectMessages(getState(), sessionId);
                    // Filter out the user message we just added and the pending assistant message
                    const historyMessages = currentMessages.filter(
                        m => m.id !== userMessageId && m.id !== assistantMessageId
                    );
                    ({ url, body } = buildChatRequest(backendUrl, historyMessages, content, chatModeConfig, configOverrides));
                    break;
                }
                case 'conversation': {
                    if (!existingConversationId) {
                        throw new Error('Conversation mode requires a conversationId on the session');
                    }
                    ({ url, body } = buildConversationRequest(backendUrl, existingConversationId, content));
                    break;
                }
                case 'agent':
                default: {
                    ({ url, body } = buildAgentRequest(
                        backendUrl, agentId, existingConversationId,
                        content, variables, configOverrides, blockMode,
                    ));
                    break;
                }
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: combinedSignal,
            });

            if (!response.ok) {
                let errorMsg = `HTTP ${response.status}`;
                try {
                    const errData = await response.json();
                    errorMsg = errData.user_message || errData.error?.user_message || errData.message || errorMsg;
                } catch { /* use default */ }
                throw new Error(errorMsg);
            }

            if (!response.body) {
                throw new Error('No response body from API');
            }

            const { events, requestId, conversationId: headerConvId } = parseNdjsonStream(response, combinedSignal);
            serverRequestId = requestId;

            // conversationId from header arrives before body — set immediately
            // (agent and conversation modes may return this; chat mode typically won't)
            if (headerConvId) {
                dispatch(chatConversationsActions.setConversationId({ sessionId, conversationId: headerConvId }));
            }

            dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'streaming' }));
            dispatch(chatConversationsActions.updateMessage({
                sessionId,
                messageId: assistantMessageId,
                updates: { status: 'streaming' },
            }));

            let accumulatedContent = '';
            const blockEventsBuffer: StreamEvent[] = [];

            for await (const event of events) {
                switch (event.event) {
                    case 'data': {
                        const payload = event.data as unknown as Record<string, unknown>;
                        if (payload.event === 'conversation_id' && payload.conversation_id) {
                            dispatch(chatConversationsActions.setConversationId({
                                sessionId,
                                conversationId: payload.conversation_id as string,
                            }));
                        }
                        break;
                    }
                    case 'chunk': {
                        const chunkData = event.data as unknown as ChunkPayload;
                        accumulatedContent += chunkData.text;
                        if (blockMode) {
                            blockEventsBuffer.push(event);
                            dispatch(chatConversationsActions.updateMessage({
                                sessionId,
                                messageId: assistantMessageId,
                                updates: { content: accumulatedContent, streamEvents: [...blockEventsBuffer] },
                            }));
                        } else {
                            dispatch(chatConversationsActions.appendStreamChunk({
                                sessionId,
                                messageId: assistantMessageId,
                                chunk: chunkData.text,
                            }));
                        }
                        break;
                    }
                    case 'content_block': {
                        blockEventsBuffer.push(event);
                        dispatch(chatConversationsActions.pushStreamEvent({
                            sessionId,
                            messageId: assistantMessageId,
                            event,
                        }));
                        break;
                    }
                    case 'tool_event': {
                        if (blockMode) {
                            blockEventsBuffer.push(event);
                            dispatch(chatConversationsActions.updateMessage({
                                sessionId,
                                messageId: assistantMessageId,
                                updates: { streamEvents: [...blockEventsBuffer] },
                            }));
                        } else {
                            dispatch(chatConversationsActions.pushStreamEvent({
                                sessionId,
                                messageId: assistantMessageId,
                                event,
                            }));
                        }
                        break;
                    }
                    case 'error': {
                        const errData = event.data as unknown as ErrorPayload;
                        const errorMessage = errData.user_message || errData.message || 'Stream error';
                        dispatch(chatConversationsActions.updateMessage({
                            sessionId,
                            messageId: assistantMessageId,
                            updates: { status: 'error', content: errorMessage },
                        }));
                        throw new Error(errorMessage);
                    }
                    case 'completion':
                    case 'heartbeat':
                    case 'end':
                        break;
                }
            }

            // ── Finalize ───────────────────────────────────────────────────────
            const allStreamEvents = blockEventsBuffer;
            const persistableBlocks = extractPersistableToolBlocks(allStreamEvents);
            const toolUpdates = persistableBlocks.flatMap(b => toolCallBlockToLegacy(b));

            dispatch(chatConversationsActions.updateMessage({
                sessionId,
                messageId: assistantMessageId,
                updates: {
                    status: 'complete',
                    content: accumulatedContent,
                    ...(toolUpdates.length > 0 ? { toolUpdates } : {}),
                    ...(blockMode && blockEventsBuffer.length > 0 ? { streamEvents: [...blockEventsBuffer] } : {}),
                },
            }));

            dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'ready' }));

        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'AbortError') {
                dispatch(chatConversationsActions.updateMessage({
                    sessionId,
                    messageId: assistantMessageId,
                    updates: { status: 'error', content: 'Request cancelled' },
                }));
            } else {
                const errorMessage = err.message || 'Execution failed';
                dispatch(chatConversationsActions.updateMessage({
                    sessionId,
                    messageId: assistantMessageId,
                    updates: { status: 'error', content: errorMessage },
                }));
                dispatch(chatConversationsActions.setSessionStatus({
                    sessionId,
                    status: 'error',
                    error: errorMessage,
                }));
            }

            // Best-effort cancel on server (agent/conversation modes only)
            if (serverRequestId && apiMode !== 'chat') {
                const state2 = getState();
                const token2 = selectAccessToken(state2);
                const isLocal2 = selectIsUsingLocalhost(state2);
                const isAdmin2 = selectIsAdmin(state2);
                const backendUrl2 = isAdmin2 && isLocal2 ? BACKEND_URLS.localhost : BACKEND_URLS.production;
                const cancelHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token2) cancelHeaders['Authorization'] = `Bearer ${token2}`;
                fetch(`${backendUrl2}${ENDPOINTS.ai.cancel(serverRequestId)}`, {
                    method: 'POST',
                    headers: cancelHeaders,
                }).catch(() => { /* best-effort */ });
            }
        }
    }
);
