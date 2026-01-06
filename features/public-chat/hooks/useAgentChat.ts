'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useChatContext, ChatMessage } from '../context/ChatContext';
import { StreamEvent } from '@/components/mardown-display/chat-markdown/types';
import type { AgentExecuteRequest, AgentStreamEvent, AgentWarmRequest } from '@/types/agent-api';

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
    files?: string[];
}

// ============================================================================
// HOOK
// ============================================================================

export function useAgentChat(options: UseAgentChatOptions = {}) {
    const { state, addMessage, updateMessage, setStreaming, setExecuting, setError } = useChatContext();
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamEventsRef = useRef<StreamEvent[]>([]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
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
                return { event: 'tool_update', data: agentEvent.data };
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

    // Warm up agent (pre-cache prompt)
    const warmAgent = useCallback(async (promptId: string) => {
        try {
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com';
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };

            if (state.authToken) {
                headers['Authorization'] = `Bearer ${state.authToken}`;
            }

            const warmRequest: AgentWarmRequest = {
                prompt_id: promptId,
                is_builtin: false,
            };

            await fetch(`${BACKEND_URL}/api/agent/warm`, {
                method: 'POST',
                headers,
                body: JSON.stringify(warmRequest),
            });

            console.log('Agent pre-warmed:', promptId);
        } catch (err) {
            console.warn('Failed to pre-warm agent (non-critical):', err);
        }
    }, [state.authToken]);

    // Send message to agent
    const sendMessage = useCallback(async ({ content, variables = {}, files = [] }: SendMessageParams) => {
        if (!state.currentAgent) {
            setError({ type: 'config_error', message: 'No agent configured' });
            return false;
        }

        const promptId = state.currentAgent.promptId;
        if (!promptId) {
            setError({ type: 'config_error', message: 'No prompt ID configured' });
            return false;
        }

        // Reset state
        setError(null);
        streamEventsRef.current = [];

        // Add user message
        const userMessageId = addMessage({
            role: 'user',
            content,
            status: 'complete',
            files,
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

        setExecuting(true);
        setStreaming(true);

        try {
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com';
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };

            if (state.authToken) {
                headers['Authorization'] = `Bearer ${state.authToken}`;
            }

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

            const agentRequest: AgentExecuteRequest = {
                prompt_id: promptId,
                conversation_id: state.conversationId,
                user_input: content,
                variables: Object.keys(variables).length > 0 ? variables : undefined,
                config_overrides: Object.keys(configOverrides).length > 0 ? configOverrides : undefined,
                stream: true,
                debug: false,
                is_builtin: false,
            };

            updateMessage(assistantMessageId, { status: 'streaming' });

            const response = await fetch(`${BACKEND_URL}/api/agent/execute`, {
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
                        errorMsg = errorData.error.user_visible_message || errorData.error.message || JSON.stringify(errorData.error);
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
                                        const errorMessage = errData.user_visible_message || errData.message || 'Unknown error';
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

            // Mark as complete
            updateMessage(assistantMessageId, { status: 'complete' });
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
            setExecuting(false);
            setStreaming(false);
            abortControllerRef.current = null;
        }
    }, [
        state.currentAgent,
        state.conversationId,
        state.authToken,
        state.modelOverride,
        state.settings,
        addMessage,
        updateMessage,
        setStreaming,
        setExecuting,
        setError,
        convertAgentEventToStreamEvent,
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
