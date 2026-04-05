/**
 * sendMessage thunk — Smart unified AI message dispatcher
 *
 * This thunk owns ALL intelligence for sending a message. Components and hooks
 * supply only the minimum needed (sessionId, content). Everything else is read
 * from Redux state automatically:
 *
 *   - agentId            → session.agentId
 *   - conversationId     → session.conversationId (set from X-Conversation-ID header)
 *   - apiMode            → session.apiMode  (agent / conversation / chat)
 *   - modelOverride      → uiState.modelOverride
 *   - modelSettings      → uiState.modelSettings  (temperature, max_tokens, etc.)
 *   - blockMode          → isAdmin && uiState.useBlockMode
 *   - auth headers       → callApi (userSlice)
 *   - backend URL        → callApi (apiConfigSlice — selectResolvedBaseUrl, all 6 environments)
 *
 * Routing logic (agent mode):
 *   - no conversationId  → POST /ai/prompts/{agentId}  or /ai/agents-blocks/{agentId} (block mode only)
 *   - has conversationId → POST /ai/conversations/{conversationId}  (auto-upgrades)
 *
 * The X-Conversation-ID response header is captured via onStreamStart and
 * dispatched to Redux immediately — before any stream events — so the UI can
 * update URL params for bookmarking while tokens are still streaming.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '@/lib/redux/store';
import { callApi, type ApiCallError } from '@/lib/api/call-api';
import { extractPersistableToolBlocks, toolCallBlockToLegacy } from '@/lib/chat-protocol';
import type { ChunkPayload, ErrorPayload, StreamEvent } from '@/types/python-generated/stream-events';
import { chatConversationsActions } from '../slice';
import { selectConversationId, selectUIState, selectMessages } from '../selectors';
import { loadConversationHistory } from './loadConversationHistory';
import { selectIsAdmin } from '@/lib/redux/slices/userSlice';
import type { ConversationResource, ChatModeConfig, ConversationMessage } from '../types';

// ============================================================================
// PAYLOAD
// ============================================================================

export interface SendMessagePayload {
    sessionId: string;
    content: string;
    resources?: ConversationResource[];
    variables?: Record<string, unknown>;
    signal?: AbortSignal;
}

// ============================================================================
// CHAT BODY BUILDER
// Constructs the full payload for the stateless /ai/chat endpoint.
// This is the only endpoint where the caller must send full message history.
// ============================================================================

function buildChatBody(
    history: ConversationMessage[],
    newContent: string,
    config: ChatModeConfig,
    configOverrides: Record<string, unknown>,
    resources: ConversationResource[],
): Record<string, unknown> {
    const messages = history
        .filter(m => m.status !== 'error')
        .map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: newContent });

    const body: Record<string, unknown> = {
        messages,
        ai_model_id: configOverrides.ai_model_id ?? config.aiModelId,
        resources: resources.length > 0 ? resources : undefined,
        stream: true,
        debug: true,
    };

    if (config.systemInstruction) body.system_instruction = config.systemInstruction;
    if (config.temperature != null) body.temperature = config.temperature;
    if (config.maxOutputTokens != null) body.max_output_tokens = config.maxOutputTokens;
    if (config.topP != null) body.top_p = config.topP;
    if (config.topK != null) body.top_k = config.topK;
    if (config.tools) body.tools = config.tools;
    if (config.toolChoice != null) body.tool_choice = config.toolChoice;
    if (config.parallelToolCalls != null) body.parallel_tool_calls = config.parallelToolCalls;
    if (config.responseFormat !== undefined) body.response_format = config.responseFormat;
    if (config.internalWebSearch != null) body.internal_web_search = config.internalWebSearch;
    if (config.internalUrlContext != null) body.internal_url_context = config.internalUrlContext;
    if (config.reasoningEffort != null) body.reasoning_effort = config.reasoningEffort;
    if (config.reasoningSummary != null) body.reasoning_summary = config.reasoningSummary;
    if (config.thinkingLevel != null) body.thinking_level = config.thinkingLevel;
    if (config.thinkingBudget != null) body.thinking_budget = config.thinkingBudget;
    if (config.includeThoughts != null) body.include_thoughts = config.includeThoughts;
    if (config.extraConfig) Object.assign(body, config.extraConfig);

    return body;
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
    async ({ sessionId, content, resources = [], variables = {}, signal }, { dispatch, getState }) => {
        const state = getState();
        const session = state.chatConversations.sessions[sessionId];
        if (!session) throw new Error(`No session found for sessionId: ${sessionId}`);

        const { apiMode, chatModeConfig, agentId } = session;
        const existingConversationId = selectConversationId(state, sessionId);
        const uiState = selectUIState(state, sessionId);
        const isAdmin = selectIsAdmin(state);
        const blockMode = isAdmin && uiState.useBlockMode;

        // ── Config overrides are read from Redux UI state, NOT passed by the caller.
        // Components only dispatch UI-level actions (e.g. selectModel). The thunk
        // assembles all configuration from those centralized signals.
        //
        // IMPORTANT: config_overrides maps to LLMParams on the backend, which uses
        // extra_forbidden — only whitelisted fields are accepted. The raw modelSettings
        // blob from the DB contains non-LLM fields (tools, stream, file_urls, etc.)
        // that must be stripped before sending. modelOverride maps to `model`, not `ai_model_id`.
        const VALID_LLM_PARAMS = new Set([
            'model', 'max_output_tokens', 'temperature', 'top_p', 'top_k',
            'tool_choice', 'parallel_tool_calls', 'reasoning_effort', 'reasoning_summary',
            'thinking_level', 'include_thoughts', 'thinking_budget', 'response_format',
            'stop_sequences', 'stream', 'store', 'verbosity',
            'internal_web_search', 'internal_url_context',
            'size', 'quality', 'count', 'tts_voice', 'audio_format', 'seconds', 'fps', 'steps', 'seed',
        ]);

        const configOverrides: Record<string, unknown> = {};
        if (uiState.modelOverride) configOverrides.model = uiState.modelOverride;
        if (uiState.modelSettings && Object.keys(uiState.modelSettings).length > 0) {
            for (const [key, value] of Object.entries(uiState.modelSettings)) {
                if (VALID_LLM_PARAMS.has(key)) {
                    configOverrides[key] = value;
                }
            }
        }

        // ── Message context: deferred context objects (questionnaire responses, etc.)
        // Read from activeChatSlice — components write here, thunk reads and ships.
        const messageContext: Record<string, unknown> = state.activeChat?.messageContext ?? {};
        const hasContext = Object.keys(messageContext).length > 0;

        // ── Optimistic message creation: add both messages to Redux before the call
        // so the UI renders instantly without waiting for the first token. ─────────
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

        const assistantMessageId = uuidv4();
        dispatch(chatConversationsActions.addMessage({
            sessionId,
            message: { id: assistantMessageId, role: 'assistant', content: '', status: 'pending' },
        }));

        dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'executing' }));

        // ── Closure state — shared across all streaming callbacks ─────────────
        let serverRequestId: string | null = null;
        let accumulatedContent = '';
        // blockEventsBuffer: all events when in block mode (used for tool extraction + display)
        const blockEventsBuffer: StreamEvent[] = [];
        // toolEventsBuffer: all tool_event entries regardless of mode.
        // Used in onStreamComplete for non-block mode to build toolUpdates,
        // producing the same Redux message shape as DB-loaded messages.
        const toolEventsBuffer: StreamEvent[] = [];

        // ── Streaming callbacks — all Redux dispatch logic lives here ──────────

        const onStreamStart = (requestId: string | null, conversationId: string | null) => {
            serverRequestId = requestId;
            // conversationId from X-Conversation-ID header arrives BEFORE any stream events.
            // Dispatch immediately so the UI can update the URL for shareability/bookmarking
            // while tokens are still streaming — this is the earliest possible moment.
            if (conversationId) {
                dispatch(chatConversationsActions.setConversationId({ sessionId, conversationId }));
            }
            dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'streaming' }));
            dispatch(chatConversationsActions.updateMessage({
                sessionId,
                messageId: assistantMessageId,
                updates: { status: 'streaming' },
            }));
        };

        const onStreamEvent = (event: StreamEvent) => {
            switch (event.event) {
                case 'data': {
                    // Fallback path: some older server configs emit conversation_id in the body
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
                    const { text } = event.data as unknown as ChunkPayload;
                    accumulatedContent += text;
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
                            chunk: text,
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
                    // Always buffer tool events — used in onStreamComplete to build toolUpdates
                    // regardless of mode, so the completed message matches DB-loaded structure.
                    toolEventsBuffer.push(event);
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
                    dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'error', error: errorMessage }));
                    break;
                }
                case 'completion':
                case 'heartbeat':
                case 'end':
                    break;
            }
        };

        const onStreamComplete = (_requestId: string | null, _conversationId: string | null) => {
            // Build toolUpdates from the appropriate buffer:
            //   block mode   → blockEventsBuffer (has chunks + tool events → same canonical pipeline)
            //   non-block mode → toolEventsBuffer (tool events only)
            // Both paths produce identical ToolCallObject[] structure, matching DB-loaded messages.
            const eventsForTools = blockMode ? blockEventsBuffer : toolEventsBuffer;
            const persistableBlocks = extractPersistableToolBlocks(eventsForTools);
            const toolUpdates = persistableBlocks.flatMap(b => toolCallBlockToLegacy(b));

            dispatch(chatConversationsActions.updateMessage({
                sessionId,
                messageId: assistantMessageId,
                updates: {
                    status: 'complete',
                    content: accumulatedContent,
                    rawContent: [{ type: 'text', text: accumulatedContent }],
                    // NOTE: originalDisplayContent is intentionally NOT set here.
                    // Without it, the dirty-message detection won't trigger and the
                    // save button won't appear — preventing edits against a message
                    // that only has a client-generated UUID (which doesn't exist in
                    // the DB). The DB reload below replaces these with real-ID
                    // messages that DO have originalDisplayContent set.
                    ...(toolUpdates.length > 0 ? { toolUpdates } : {}),
                    // Block mode: keep streamEvents so StreamingContentBlocks renders interleaved order.
                    // Non-block mode: clear streamEvents — rendered live during stream; now use
                    // toolUpdates + content (same shape as DB-loaded messages).
                    streamEvents: blockMode && blockEventsBuffer.length > 0 ? [...blockEventsBuffer] : undefined,
                },
            }));
            dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'ready' }));

            // ── Sync with DB: replace client-generated IDs with real DB IDs ──
            // The backend commits cx_message rows before the stream end event,
            // so the data is already available. This reload replaces the
            // optimistic messages (which have fake UUIDs) with DB-authoritative
            // versions that have real IDs, rawContent, originalDisplayContent,
            // contentHistory, and tool call records — enabling safe editing.
            const resolvedConversationId = _conversationId ?? selectConversationId(getState(), sessionId);
            if (resolvedConversationId) {
                dispatch(loadConversationHistory({
                    sessionId,
                    conversationId: resolvedConversationId,
                    agentId,
                }));
            }
        };

        const onStreamError = (error: ApiCallError) => {
            const message = error.type === 'abort_error' ? 'Request cancelled' : error.message;
            dispatch(chatConversationsActions.updateMessage({
                sessionId,
                messageId: assistantMessageId,
                updates: { status: 'error', content: message },
            }));
            if (error.type !== 'abort_error') {
                dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'error', error: message }));
            }
        };

        // All 5 callbacks passed to every callApi call below.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const streamCallbacks: any = { onStreamStart, onStreamEvent, onStreamComplete, onStreamError, signal, stream: true };

        try {
            // ── Routing: choose the right endpoint based on apiMode + session state ──
            //
            // agent mode (auto-routing):
            //   - has conversationId → POST /ai/conversations/{id}  (continue)
            //   - no conversationId  → POST /ai/prompts/{id}  or  /ai/agents-blocks/{id} (block mode only)
            // conversation mode:
            //   - always POST /ai/conversations/{id}  (requires pre-existing conversationId)
            // chat mode:
            //   - always POST /ai/chat  (stateless, client sends full history)
            //
            let result;

            // Shared context payload — included in all non-chat endpoints
            const contextPayload = hasContext ? messageContext : {};

            if (apiMode === 'chat') {
                if (!chatModeConfig) throw new Error('Chat mode requires chatModeConfig on the session');
                const history = selectMessages(getState(), sessionId).filter(
                    m => m.id !== userMessageId && m.id !== assistantMessageId,
                );
                result = await dispatch(callApi({
                    path: '/ai/chat',
                    method: 'POST',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    body: buildChatBody(history, content, chatModeConfig, configOverrides, resources) as any,
                    ...streamCallbacks,
                }));

            } else if (apiMode === 'conversation') {
                if (!existingConversationId) throw new Error('Conversation mode requires a conversationId on the session');
                result = await dispatch(callApi({
                    path: '/ai/conversations/{conversation_id}',
                    method: 'POST',
                    pathParams: { conversation_id: existingConversationId },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    body: { user_input: content, resources: resources.length > 0 ? resources : undefined, stream: true, debug: true, client_tools: [], context: contextPayload } as any,
                    ...streamCallbacks,
                }));

            } else {
                if (existingConversationId) {
                    result = await dispatch(callApi({
                        path: '/ai/conversations/{conversation_id}',
                        method: 'POST',
                        pathParams: { conversation_id: existingConversationId },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        body: { user_input: content, resources: resources.length > 0 ? resources : undefined, stream: true, debug: true, client_tools: [], context: contextPayload } as any,
                        ...streamCallbacks,
                    }));
                } else if (blockMode) {
                    result = await dispatch(callApi({
                        path: '/ai/agents-blocks/{agent_id}',
                        method: 'POST',
                        pathParams: { agent_id: agentId },
                        body: {
                            user_input: content,
                            variables: Object.keys(variables).length > 0 ? variables : undefined,
                            config_overrides: Object.keys(configOverrides).length > 0 ? configOverrides : undefined,
                            resources: resources.length > 0 ? resources : undefined,
                            stream: true,
                            debug: true,
                            context: contextPayload,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } as any,
                        ...streamCallbacks,
                    }));
                } else {
                    result = await dispatch(callApi({
                        path: '/ai/prompts/{prompt_id}',
                        method: 'POST',
                        pathParams: { prompt_id: agentId },
                        body: {
                            user_input: content,
                            variables: Object.keys(variables).length > 0 ? variables : undefined,
                            config_overrides: Object.keys(configOverrides).length > 0 ? configOverrides : undefined,
                            stream: true,
                            debug: true,
                            client_tools: [],
                            context: contextPayload,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } as any,
                        ...streamCallbacks,
                    }));
                }
            }

            // Hard HTTP error — streaming callbacks already updated message state.
            // Throw here so createAsyncThunk marks its own state as rejected.
            if (result.error && result.error.type !== 'abort_error') {
                throw new Error(result.error.message);
            }

        } catch (error: unknown) {
            const err = error as Error;
            if (err.name !== 'AbortError') {
                const errorMessage = err.message || 'Execution failed';
                dispatch(chatConversationsActions.updateMessage({
                    sessionId,
                    messageId: assistantMessageId,
                    updates: { status: 'error', content: errorMessage },
                }));
                dispatch(chatConversationsActions.setSessionStatus({ sessionId, status: 'error', error: errorMessage }));
            }

            // Best-effort server-side cancel. Uses callApi so auth/URL are handled automatically.
            if (serverRequestId && apiMode !== 'chat') {
                dispatch(callApi({
                    path: '/ai/cancel/{request_id}',
                    method: 'POST',
                    pathParams: { request_id: serverRequestId },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                })).catch(() => { /* best-effort */ });
            }
        }
    },
);
