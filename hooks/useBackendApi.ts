/**
 * Unified Backend API Hook
 * 
 * Single source of truth for:
 * - Backend URL (respects admin localhost override)
 * - API headers (auth + content-type)
 * - Ready-to-use fetch helper
 * 
 * Usage:
 * ```typescript
 * const api = useBackendApi();
 * const response = await api.post('/api/ai/agents/{conversationId}/execute', requestBody);
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useApiAuth } from './useApiAuth';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { selectIsAdmin } from '@/lib/redux/slices/userSlice';
import { BACKEND_URLS } from '@/lib/api/endpoints';

export function useBackendApi() {
    const { getHeaders, waitForAuth } = useApiAuth();
    const useLocalhost = useSelector(selectIsUsingLocalhost);
    const isAdmin = useSelector(selectIsAdmin);

    // Backend URL - determined by Redux state
    const backendUrl = useMemo(() => {
        const url = (isAdmin && useLocalhost)
            ? BACKEND_URLS.localhost
            : BACKEND_URLS.production;
        console.log('[useBackendApi] isAdmin:', isAdmin, '| useLocalhost:', useLocalhost, '| backendUrl:', url);
        return url;
    }, [isAdmin, useLocalhost]);

    // Ready-to-use headers
    const getApiHeaders = useCallback((includeContentType = true) => {
        const authHeaders = getHeaders();
        if (includeContentType) {
            return {
                'Content-Type': 'application/json',
                ...authHeaders,
            };
        }
        return authHeaders;
    }, [getHeaders]);

    // Unified POST helper
    const post = useCallback(async (endpoint: string, body: any, signal?: AbortSignal) => {
        await waitForAuth();
        console.log('[useBackendApi] POST', `${backendUrl}${endpoint}`);
        const response = await fetch(`${backendUrl}${endpoint}`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify(body),
            signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`HTTP ${response.status}: ${errorData.detail || errorData.message || 'Unknown error'}`);
        }

        return response;
    }, [backendUrl, getApiHeaders, waitForAuth]);

    // Unified GET helper
    const get = useCallback(async (endpoint: string, signal?: AbortSignal) => {
        await waitForAuth();
        console.log('[useBackendApi] GET', `${backendUrl}${endpoint}`);
        const response = await fetch(`${backendUrl}${endpoint}`, {
            method: 'GET',
            headers: getApiHeaders(),
            signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`HTTP ${response.status}: ${errorData.detail || errorData.message || 'Unknown error'}`);
        }

        return response;
    }, [backendUrl, getApiHeaders, waitForAuth]);

    // Upload helper (FormData - no Content-Type)
    const upload = useCallback(async (endpoint: string, formData: FormData, signal?: AbortSignal) => {
        await waitForAuth();
        
        const response = await fetch(`${backendUrl}${endpoint}`, {
            method: 'POST',
            headers: getApiHeaders(false), // No Content-Type for FormData
            body: formData,
            signal,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`HTTP ${response.status}: ${errorData.detail || errorData.message || 'Unknown error'}`);
        }

        return response;
    }, [backendUrl, getApiHeaders, waitForAuth]);

    const customFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        await waitForAuth();
        return fetch(`${backendUrl}${endpoint}`, {
            ...options,
            headers: {
                ...getApiHeaders(),
                ...options.headers,
            },
        });
    }, [backendUrl, getApiHeaders, waitForAuth]);

    return useMemo(() => ({
        backendUrl,
        getHeaders: getApiHeaders,
        waitForAuth,
        post,
        get,
        upload,
        fetch: customFetch,
    }), [backendUrl, getApiHeaders, waitForAuth, post, get, upload, customFetch]);
}
