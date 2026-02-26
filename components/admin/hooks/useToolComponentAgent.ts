'use client';

import { useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useApiAuth } from '@/hooks/useApiAuth';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { ENDPOINTS, BACKEND_URLS } from '@/lib/api/endpoints';
import { parseNdjsonStream } from '@/lib/api/stream-parser';
import type { ChunkPayload, ErrorPayload } from '@/types/python-generated/stream-events';
import type { RootState } from '@/lib/redux/store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecuteParams {
    agentId: string;
    variables: Record<string, string>;
    userInput?: string;
}

interface UseToolComponentAgentReturn {
    execute: (params: ExecuteParams) => Promise<string | null>;
    cancel: () => void;
    isStreaming: boolean;
    accumulatedText: string;
    error: string | null;
    reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Lightweight agent execution hook for the Tool UI Component Generator.
 *
 * Bypasses ChatContext entirely — uses simple local state for streaming.
 * Streams from POST /api/ai/agents/{agentId} via NDJSON, accumulates chunks,
 * and returns the full text on completion.
 *
 * Pattern mirrors useAgentChat but without any message management or context deps.
 */
export function useToolComponentAgent(): UseToolComponentAgentReturn {
    const { getHeaders, waitForAuth, isAdmin } = useApiAuth();
    const useLocalhost = useSelector((state: RootState) => selectIsUsingLocalhost(state));

    const [isStreaming, setIsStreaming] = useState(false);
    const [accumulatedText, setAccumulatedText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const accumulatedRef = useRef('');

    const getBackendUrl = useCallback(() => {
        if (isAdmin && useLocalhost) return BACKEND_URLS.localhost;
        return BACKEND_URLS.production;
    }, [isAdmin, useLocalhost]);

    const reset = useCallback(() => {
        setAccumulatedText('');
        setError(null);
        accumulatedRef.current = '';
    }, []);

    const cancel = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    const execute = useCallback(async ({ agentId, variables, userInput }: ExecuteParams): Promise<string | null> => {
        const authReady = await waitForAuth();
        if (!authReady) {
            setError('Unable to verify access. Please refresh the page.');
            return null;
        }

        // Reset state
        accumulatedRef.current = '';
        setAccumulatedText('');
        setError(null);
        setIsStreaming(true);

        abortControllerRef.current = new AbortController();

        try {
            const BACKEND_URL = getBackendUrl();
            const headers = getHeaders();
            const executeUrl = `${BACKEND_URL}${ENDPOINTS.ai.agentStart(agentId)}`;

            const response = await fetch(executeUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    user_input: userInput?.trim() || 'Generate the component now.',
                    variables,
                    stream: true,
                    debug: true,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                let errorMsg = `HTTP ${response.status}`;
                try {
                    const errData = await response.json();
                    errorMsg =
                        errData?.error?.user_message ||
                        errData?.error?.message ||
                        errData?.user_message ||
                        errData?.error ||
                        errData?.message ||
                        errorMsg;
                } catch {
                    // use default
                }
                throw new Error(String(errorMsg));
            }

            if (!response.body) throw new Error('No response body from Agent API');

            const { events } = parseNdjsonStream(response, abortControllerRef.current.signal);

            for await (const event of events) {
                switch (event.event) {
                    case 'chunk': {
                        const chunkData = event.data as unknown as ChunkPayload;
                        if (chunkData?.text) {
                            accumulatedRef.current += chunkData.text;
                            setAccumulatedText(accumulatedRef.current);
                        }
                        break;
                    }
                    case 'error': {
                        const errData = event.data as unknown as ErrorPayload;
                        const message = errData?.user_message || errData?.message || 'Stream error';
                        setError(String(message));
                        break;
                    }
                    default:
                        break;
                }
            }

            return accumulatedRef.current;
        } catch (err: unknown) {
            const e = err as Error;
            if (e.name === 'AbortError') {
                setError('Generation cancelled.');
            } else {
                setError(e.message || 'Unknown error during generation');
            }
            return null;
        } finally {
            setIsStreaming(false);
            abortControllerRef.current = null;
        }
    }, [getBackendUrl, getHeaders, waitForAuth]);

    return { execute, cancel, isStreaming, accumulatedText, error, reset };
}
