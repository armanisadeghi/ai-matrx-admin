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
 * const response = await api.post('/api/ai/agent/execute', requestBody);
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useApiAuth } from './useApiAuth';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import { selectUser } from '@/lib/redux/slices/userSlice';
import { BACKEND_URLS } from '@/lib/api/endpoints';

export function useBackendApi() {
    const { getHeaders, waitForAuth } = useApiAuth();
    const useLocalhost = useSelector(selectIsUsingLocalhost);
    const user = useSelector(selectUser);
    const isAdmin = user?.role === 'admin';

    // Backend URL - determined by Redux state
    const backendUrl = useMemo(() => {
        return (isAdmin && useLocalhost)
            ? BACKEND_URLS.localhost
            : BACKEND_URLS.production;
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

    return {
        // Core values
        backendUrl,
        headers: getApiHeaders(),
        
        // Helpers
        getHeaders: getApiHeaders,
        waitForAuth,
        
        // Fetch methods
        post,
        get,
        upload,
        
        // For custom fetch calls
        fetch: useCallback(async (endpoint: string, options: RequestInit = {}) => {
            await waitForAuth();
            return fetch(`${backendUrl}${endpoint}`, {
                ...options,
                headers: {
                    ...getApiHeaders(),
                    ...options.headers,
                },
            });
        }, [backendUrl, getApiHeaders, waitForAuth]),
    };
}
