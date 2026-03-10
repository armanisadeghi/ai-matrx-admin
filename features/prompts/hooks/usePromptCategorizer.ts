'use client';

import { useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useApiAuth } from '@/hooks/useApiAuth';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { ENDPOINTS, BACKEND_URLS } from '@/lib/api/endpoints';

export interface CategorizationResult {
    category: string | null;
    tags: string[];
    description: string | null;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export interface UsePromptCategorizerReturn {
    categorize: (promptId: string) => Promise<CategorizationResult | null>;
    status: Status;
    error: string | null;
    cancel: () => void;
}

/**
 * Calls the Python /builtin-agents/categorize/sync endpoint and returns
 * the AI-suggested category, tags, and description for a prompt.
 *
 * Uses the sync (non-streaming) endpoint — the caller receives the result
 * directly and can pre-fill the metadata form for the user to review.
 */
export function usePromptCategorizer(): UsePromptCategorizerReturn {
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const { getHeaders, waitForAuth, isAdmin } = useApiAuth();
    const useLocalhost = useSelector(selectIsUsingLocalhost);

    const getBackendUrl = useCallback(() => {
        return isAdmin && useLocalhost
            ? BACKEND_URLS.localhost
            : BACKEND_URLS.production;
    }, [isAdmin, useLocalhost]);

    const categorize = useCallback(async (promptId: string): Promise<CategorizationResult | null> => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setStatus('loading');
        setError(null);

        try {
            await waitForAuth();
            const headers = getHeaders();
            const backendUrl = getBackendUrl();

            const response = await fetch(`${backendUrl}${ENDPOINTS.builtinAgents.categorizeSync}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ prompt_id: promptId, dry_run: false }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body?.detail?.error || body?.error || `Request failed (${response.status})`);
            }

            const data = await response.json();

            const result: CategorizationResult = {
                category: data.category ?? null,
                tags: data.tags ?? [],
                description: data.description ?? null,
            };

            setStatus('success');
            return result;
        } catch (err) {
            if ((err as Error).name === 'AbortError') {
                setStatus('idle');
                return null;
            }
            const message = err instanceof Error ? err.message : 'Categorization failed';
            setError(message);
            setStatus('error');
            return null;
        }
    }, [getHeaders, waitForAuth, getBackendUrl]);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setStatus('idle');
        setError(null);
    }, []);

    return { categorize, status, error, cancel };
}
