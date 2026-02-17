'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import { extractPersistableToolUpdates } from '@/components/mardown-display/chat-markdown/tool-event-engine';
import { buildContentArray, ContentItem, PublicResource } from '../types/content';
import type { AgentStreamEvent, AgentWarmRequest } from '@/features/public-chat/types/agent-api';
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
    variables?: Record<string, any>;
    /** Resources to attach to the message */
    resources?: PublicResource[];
}

/**
 * Agent Execute Request with content array support 
 */
interface AgentExecuteRequestWithContent {
    prompt_id: string;
    conversation_id: string;
    user_input: string | ContentItem[];
    variables?: Record<string, any>;
    config_overrides?: Record<string, unknown>;
    stream: boolean;
    debug: boolean;
    is_builtin: boolean;
    is_new_conversation: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAgentChat(options: UseAgentChatOptions = {}) {
    const { state, addMessage, updateMessage, setStreaming, setExecuting, setError } = useChatContext();
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamEventsRef = useRef<StreamEvent[]>([]);
    // Track executing state in a ref so the cleanup effect always reads the
    // current value (not a stale closure capture).
    const isExecutingRef = useRef(false);
    
    // Centralized auth - handles both authenticated users and guests
    const { getHeaders, waitForAuth, isAdmin } = useApiAuth();

    // Keep executing ref in sync
    useEffect(() => {
        isExecutingRef.current = state.isExecuting;
    }, [state.isExecuting]);

    // Cleanup on unmount — only abort if NOT actively executing a request.
    // During same-layout route transitions (e.g. /p/chat → /p/chat/c/[id]),
    // ChatContainer remounts but the ChatContext (and the in-flight request)
    // should survive. Aborting here would kill the request mid-stream.
    useEffect(() => {
        return () => {
            if (abortControllerRef.current && !isExecutingRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Convert Agent API events to StreamEvent format
    const convertAgentEventToStreamEvent = useCallback((agentEvent: AgentStreamEvent): StreamEvent | null => {
        switch (agentEvent.event) {
            case 'chunk':
                return { event: 'chunk', data: agentEvent.data };
            case 'status_update':
                return { event: 'status_update', data: agentEvent.data };
            case 'tool_update':
                // Legacy format — kept for backward compat during transition
                return { event: 'tool_update', data: agentEvent.data };
            case 'tool_event':
                // V2 tool events — pass through with the full data envelope
                return { event: 'tool_event', data: agentEvent.data };
            case 'data':
                return { event: 'data', data: agentEvent.data };
            case 'error':
                return { event: 'error', data: agentEvent.data };
            case 'end':
                return { event: 'end', data: true };
            default:
                return null;
        }
    }, []);

    // Get backend URL (admin can override to localhost via Redux)
    const getBackendUrl = useCallback(() => {
        if (isAdmin && state.useLocalhost) {
            return 'http://localhost:8000';
        }
        return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com';
    }, [isAdmin, state.useLocalhost]);

    // Warm up agent (pre-cache prompt) - no auth required for production backend.
    // When targeting localhost (admin override), skip the eager warm entirely to
    // avoid browser-level ERR_CONNECTION_REFUSED console noise. The warm will be
    // attempted lazily when the admin actually sends a message.
    const warmAgent = useCallback(async (promptId: string) => {
        try {
            const BACKEND_URL = getBackendUrl();

            // Never eagerly warm to localhost — the browser will log
            // ERR_CONNECTION_REFUSED which cannot be suppressed from JS.
            // Localhost warm happens implicitly on first sendMessage instead.
            if (BACKEND_URL.includes('localhost')) return;

            const warmRequest: AgentWarmRequest = {
                prompt_id: promptId,
                is_builtin: false,
            };

            await fetch(`${BACKEND_URL}/api/ai/agent/warm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(warmRequest),
            });
        } catch {
            // Silently ignore — warming is non-critical
        }
    }, [getBackendUrl]);

    // Send message to agent
    const sendMessage = useCallback(async ({ content, variables = {}, resources = [] }: SendMessageParams) => {
        if (!state.currentAgent) {
            setError({ type: 'config_error', message: 'No agent configured' });
            return false;
        }

        const promptId = state.currentAgent.promptId;
        if (!promptId) {
            setError({ type: 'config_error', message: 'No prompt ID configured' });
            return false;
        }

        // Wait for auth to be ready (handles both authenticated users and guests)
        const authReady = await waitForAuth();
        if (!authReady) {
            setError({ type: 'auth_error', message: 'Unable to verify access. Please refresh the page.' });
            return false;
        }

        // Reset state
        setError(null);
        streamEventsRef.current = [];

        // Determine if this is a new conversation (before adding messages)
        // True when there are no messages yet, false for all subsequent messages
        const isNewConversation = state.messages.length === 0;

        // Build content array for API
        const contentItems = buildContentArray(content, resources);

        // Add user message with resources
        const userMessageId = addMessage({
            role: 'user',
            content,
            status: 'complete',
            resources: resources.length > 0 ? resources : undefined,
            contentItems: contentItems.length > 1 ? contentItems : undefined,
            variables,
        });

        // Add assistant message placeholder
        const assistantMessageId = addMessage({
            role: 'assistant',
            content: '',
            status: 'pending',
        });

        // Create abort controller
        abortControllerRef.current = new AbortController();

        // Set executing immediately in the ref (not just via dispatch) so the
        // unmount cleanup sees the current value even before React re-renders.
        isExecutingRef.current = true;
        setExecuting(true);
        setStreaming(true);

        try {
            const BACKEND_URL = getBackendUrl();
            
            // Get auth headers (handles both authenticated users and guests)
            const headers = getHeaders();

            // Build config overrides
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

            // Build request - use content array if we have resources, otherwise just text
            const userInput = contentItems.length > 1 
                ? contentItems 
                : content;

            const agentRequest: AgentExecuteRequestWithContent = {
                prompt_id: promptId,
                conversation_id: state.conversationId,
                user_input: userInput,
                variables: Object.keys(variables).length > 0 ? variables : undefined,
                config_overrides: Object.keys(configOverrides).length > 0 ? configOverrides : undefined,
                stream: true,
                debug: true,
                is_builtin: false,
                is_new_conversation: isNewConversation,
            };

            // Debug log to verify variables are being sent
            if (variables && Object.keys(variables).length > 0) {
                console.log('📝 Sending variables to API:', variables);
            }

            updateMessage(assistantMessageId, { status: 'streaming' });

            const response = await fetch(`${BACKEND_URL}/api/ai/agent/execute`, {
                method: 'POST',
                headers,
                body: JSON.stringify(agentRequest),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                let errorMsg = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (typeof errorData.error === 'object' && errorData.error !== null) {
                        errorMsg = errorData.error.user_message || errorData.error.user_visible_message || errorData.error.message || JSON.stringify(errorData.error);
                    } else if (typeof errorData.user_message === 'string') {
                        errorMsg = errorData.user_message;
                    } else {
                        errorMsg = errorData.error || errorData.message || errorData.details || errorMsg;
                    }
                } catch (e) {
                    // Use default error
                }
                throw new Error(errorMsg);
            }

            if (!response.body) {
                throw new Error('No response body from Agent API');
            }

            // Process streaming NDJSON response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let buffer = '';
            let accumulatedContent = '';

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;

                if (value) {
                    const decodedChunk = decoder.decode(value, { stream: true });
                    buffer += decodedChunk;

                    // Process complete lines (NDJSON format)
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const agentEvent = JSON.parse(line) as AgentStreamEvent;
                                const streamEvent = convertAgentEventToStreamEvent(agentEvent);

                                if (streamEvent) {
                                    streamEventsRef.current.push(streamEvent);
                                    options.onStreamEvent?.(streamEvent);

                                    // Handle chunk events (accumulate text)
                                    if (agentEvent.event === 'chunk' && typeof agentEvent.data === 'string') {
                                        accumulatedContent += agentEvent.data;
                                        updateMessage(assistantMessageId, {
                                            content: accumulatedContent,
                                        });
                                    }

                                    // Handle error events
                                    if (agentEvent.event === 'error') {
                                        const errData = agentEvent.data;
                                        const errorMessage = errData.user_message || errData.user_visible_message || errData.message || 'Unknown error';
                                        setError({ type: 'stream_error', message: errorMessage });
                                        options.onError?.(errorMessage);
                                    }
                                }
                            } catch (e) {
                                console.warn('Failed to parse Agent API event:', line, e);
                            }
                        }
                    }
                }
            }

            // Process remaining buffer
            if (buffer.trim()) {
                try {
                    const agentEvent = JSON.parse(buffer) as AgentStreamEvent;
                    const streamEvent = convertAgentEventToStreamEvent(agentEvent);
                    if (streamEvent) {
                        streamEventsRef.current.push(streamEvent);
                        options.onStreamEvent?.(streamEvent);

                        if (agentEvent.event === 'chunk' && typeof agentEvent.data === 'string') {
                            accumulatedContent += agentEvent.data;
                            updateMessage(assistantMessageId, { content: accumulatedContent });
                        }
                    }
                } catch (e) {
                    console.warn('Failed to parse final Agent API event:', buffer, e);
                }
            }

            // Extract tool updates from the stream and persist them on the
            // assistant message so they survive after stream events are cleared.
            // Uses the shared tool-event-engine for consistent conversion.
            const toolUpdates = extractPersistableToolUpdates(streamEventsRef.current);

            // Mark as complete, attaching any tool updates from the stream
            updateMessage(assistantMessageId, {
                status: 'complete',
                ...(toolUpdates.length > 0 ? { toolUpdates } : {}),
            });
            options.onComplete?.();
            return true;

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Request aborted');
                updateMessage(assistantMessageId, { status: 'error', content: 'Request cancelled' });
            } else {
                console.error('Agent execution error:', error);
                const errorMessage = error.message || 'Execution failed';
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
    }, [
        state.currentAgent,
        state.conversationId,
        state.modelOverride,
        state.settings,
        waitForAuth,
        getHeaders,
        addMessage,
        updateMessage,
        setStreaming,
        setExecuting,
        setError,
        convertAgentEventToStreamEvent,
        getBackendUrl,
        options,
    ]);

    // Cancel ongoing request
    const cancelRequest = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    // Get current stream events
    const getStreamEvents = useCallback(() => {
        return streamEventsRef.current;
    }, []);

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
