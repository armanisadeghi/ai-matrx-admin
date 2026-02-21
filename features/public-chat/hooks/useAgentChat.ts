'use client';

import { useRef, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import type { StreamEvent, DataPayload, ChunkPayload, ErrorPayload, CompletionPayload, EndPayload } from '@/types/python-generated/stream-events';
import { parseNdjsonStream } from '@/lib/api/stream-parser';
import { extractPersistableToolUpdates } from '@/components/mardown-display/chat-markdown/tool-event-engine';
import { buildContentArray, ContentItem, PublicResource } from '../types/content';
import { ENDPOINTS, BACKEND_URLS } from '@/lib/api/endpoints';
import { useApiAuth } from '@/hooks/useApiAuth';

// ============================================================================
// TYPES
// ============================================================================

interface UseAgentChatOptions {
    onStreamEvent?: (event: StreamEvent) => void;
    onComplete?: () => void;
    onError?: (error: string) => void;
}

interface SendMessageParams {
    content: string;
    variables?: Record<string, unknown>;
    resources?: PublicResource[];
}

interface AgentExecuteRequestWithContent {
    prompt_id: string;
    /** Optional — pass to continue an existing conversation. Omit for a new one. */
    conversation_id?: string | null;
    user_input: string | ContentItem[];
    variables?: Record<string, unknown>;
    config_overrides?: Record<string, unknown>;
    stream: boolean;
    debug: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAgentChat(options: UseAgentChatOptions = {}) {
    const { state, addMessage, updateMessage, setStreaming, setExecuting, setError, setDbConversationId } = useChatContext();
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamEventsRef = useRef<StreamEvent[]>([]);
    const isExecutingRef = useRef(false);
    const serverRequestIdRef = useRef<string | null>(null);

    const { getHeaders, waitForAuth, isAdmin } = useApiAuth();

    useEffect(() => {
        isExecutingRef.current = state.isExecuting;
    }, [state.isExecuting]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current && !isExecutingRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const getBackendUrl = () => {
        if (isAdmin && state.useLocalhost) {
            return BACKEND_URLS.localhost;
        }
        return BACKEND_URLS.production;
    };

    const warmAgent = async (promptId: string) => {
        try {
            const BACKEND_URL = getBackendUrl();
            if (BACKEND_URL.includes('localhost')) return;

            const warmUrl = `${BACKEND_URL}${ENDPOINTS.ai.agentWarm(promptId)}`;
            console.log('[useAgentChat] warmAgent →', warmUrl);

            const res = await fetch(warmUrl, { method: 'POST' });
            console.log('[useAgentChat] warmAgent response:', res.status, res.statusText);
        } catch (err) {
            console.warn('[useAgentChat] warmAgent failed (non-critical):', err);
        }
    };

    const sendMessage = async ({ content, variables = {}, resources = [] }: SendMessageParams) => {
        if (!state.currentAgent) {
            setError({ type: 'config_error', message: 'No agent configured' });
            return false;
        }

        const promptId = state.currentAgent.promptId;
        if (!promptId) {
            setError({ type: 'config_error', message: 'No prompt ID configured' });
            return false;
        }

        const authReady = await waitForAuth();
        if (!authReady) {
            setError({ type: 'auth_error', message: 'Unable to verify access. Please refresh the page.' });
            return false;
        }

        setError(null);
        streamEventsRef.current = [];
        serverRequestIdRef.current = null;

        const contentItems = buildContentArray(content, resources);

        addMessage({
            role: 'user',
            content,
            status: 'complete',
            resources: resources.length > 0 ? resources : undefined,
            contentItems: contentItems.length > 1 ? contentItems : undefined,
            variables,
        });

        const assistantMessageId = addMessage({
            role: 'assistant',
            content: '',
            status: 'pending',
        });

        abortControllerRef.current = new AbortController();
        isExecutingRef.current = true;
        setExecuting(true);
        setStreaming(true);

        try {
            const BACKEND_URL = getBackendUrl();
            const headers = getHeaders();

            const configOverrides: Record<string, unknown> = {};
            if (state.modelOverride) {
                configOverrides.ai_model_id = state.modelOverride;
            }
            if (state.settings.searchEnabled) {
                configOverrides.web_search_enabled = true;
            }
            if (state.settings.thinkEnabled) {
                configOverrides.thinking_enabled = true;
            }

            const userInput = contentItems.length > 1 ? contentItems : content;

            const agentRequest: AgentExecuteRequestWithContent = {
                prompt_id: promptId,
                conversation_id: state.conversationId,
                user_input: userInput,
                variables: Object.keys(variables).length > 0 ? variables : undefined,
                config_overrides: Object.keys(configOverrides).length > 0 ? configOverrides : undefined,
                stream: true,
                debug: true,
            };

            updateMessage(assistantMessageId, { status: 'streaming' });

            const executeUrl = `${BACKEND_URL}${ENDPOINTS.ai.agentExecute}`;
            console.log('[useAgentChat] sendMessage → execute URL:', executeUrl);
            console.log('[useAgentChat] conversation_id:', state.conversationId);

            const response = await fetch(executeUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(agentRequest),
                signal: abortControllerRef.current.signal,
            });
            console.log('[useAgentChat] execute response:', response.status, response.statusText);

            if (!response.ok) {
                let errorMsg = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (typeof errorData.error === 'object' && errorData.error !== null) {
                        errorMsg = errorData.error.user_message || errorData.error.message || JSON.stringify(errorData.error);
                    } else if (typeof errorData.user_message === 'string') {
                        errorMsg = errorData.user_message;
                    } else {
                        errorMsg = errorData.error || errorData.message || errorData.details || errorMsg;
                    }
                } catch {
                    // Use default error
                }
                throw new Error(errorMsg);
            }

            if (!response.body) {
                throw new Error('No response body from Agent API');
            }

            const { events, requestId } = parseNdjsonStream(response, abortControllerRef.current.signal);
            serverRequestIdRef.current = requestId;

            let accumulatedContent = '';

            for await (const event of events) {
                streamEventsRef.current.push(event);
                options.onStreamEvent?.(event);

                switch (event.event) {
                    case 'data': {
                        const dataPayload = event.data as DataPayload;
                        if (dataPayload.event === 'conversation_id' && dataPayload.conversation_id) {
                            const serverId = dataPayload.conversation_id as string;
                            if (serverId !== state.conversationId) {
                                setDbConversationId(serverId);
                                console.log('[useAgentChat] server conversation_id:', serverId);
                            }
                        }
                        break;
                    }
                    case 'chunk': {
                        const chunkData = event.data as unknown as ChunkPayload;
                        accumulatedContent += chunkData.text;
                        updateMessage(assistantMessageId, { content: accumulatedContent });
                        break;
                    }
                    case 'error': {
                        const errData = event.data as unknown as ErrorPayload;
                        const errorMessage = errData.user_message || errData.message || 'Unknown error';
                        setError({ type: 'stream_error', message: errorMessage });
                        options.onError?.(errorMessage);
                        break;
                    }
                    case 'completion': {
                        const _completion = event.data as unknown as CompletionPayload;
                        void _completion;
                        break;
                    }
                    case 'heartbeat':
                        break;
                    case 'end': {
                        const _endData = event.data as unknown as EndPayload;
                        void _endData;
                        break;
                    }
                }
            }

            const toolUpdates = extractPersistableToolUpdates(streamEventsRef.current);

            updateMessage(assistantMessageId, {
                status: 'complete',
                ...(toolUpdates.length > 0 ? { toolUpdates } : {}),
            });
            options.onComplete?.();
            return true;

        } catch (error: unknown) {
            const err = error as Error;
            if (err.name === 'AbortError') {
                console.log('Request aborted');
                updateMessage(assistantMessageId, { status: 'error', content: 'Request cancelled' });
            } else {
                console.error('Agent execution error:', err);
                const errorMessage = err.message || 'Execution failed';
                setError({ type: 'execution_error', message: errorMessage });
                updateMessage(assistantMessageId, { status: 'error', content: errorMessage });
                options.onError?.(errorMessage);
            }
            return false;
        } finally {
            isExecutingRef.current = false;
            setExecuting(false);
            setStreaming(false);
            abortControllerRef.current = null;
        }
    };

    const cancelRequest = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const requestId = serverRequestIdRef.current;
        if (requestId) {
            try {
                const BACKEND_URL = getBackendUrl();
                const headers = getHeaders();
                await fetch(`${BACKEND_URL}${ENDPOINTS.ai.cancel(requestId)}`, {
                    method: 'POST',
                    headers,
                });
            } catch {
                // Best-effort — don't block the UI if cancel fails
            }
        }
    };

    const getStreamEvents = () => streamEventsRef.current;

    return {
        sendMessage,
        cancelRequest,
        warmAgent,
        getStreamEvents,
        isStreaming: state.isStreaming,
        isExecuting: state.isExecuting,
        error: state.error,
        messages: state.messages,
        conversationId: state.conversationId,
    };
}
