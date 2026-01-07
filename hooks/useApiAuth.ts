// hooks/useApiAuth.ts
// Centralized hook for API authentication headers
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    selectAccessToken,
    selectFingerprintId,
    selectAuthReady,
    selectIsAuthenticated,
    selectIsAdmin,
    setFingerprintId,
} from '@/lib/redux/slices/userSlice';
import { getFingerprint } from '@/lib/services/fingerprint-service';

/**
 * Centralized hook for API authentication.
 * 
 * Provides ready-to-use headers for all API calls:
 * - Authenticated users: Authorization header with Bearer token
 * - Guest users: X-Fingerprint-ID header
 * 
 * Usage:
 * ```typescript
 * const { getHeaders, isReady, waitForAuth } = useApiAuth();
 * 
 * // Simple usage (when you know auth is ready)
 * const response = await fetch(url, {
 *   method: 'POST',
 *   headers: getHeaders(),
 *   body: JSON.stringify(data),
 * });
 * 
 * // Safe usage (waits for auth if not ready)
 * await waitForAuth();
 * const response = await fetch(url, { headers: getHeaders(), ... });
 * ```
 */
export function useApiAuth() {
    const dispatch = useDispatch();
    const accessToken = useSelector(selectAccessToken);
    const fingerprintId = useSelector(selectFingerprintId);
    const authReady = useSelector(selectAuthReady);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const isAdmin = useSelector(selectIsAdmin);
    
    // Track if we're currently fetching fingerprint (for waitForAuth)
    const [isFetching, setIsFetching] = useState(false);

    /**
     * Get headers for API requests.
     * Returns headers with either Authorization (authenticated) or X-Fingerprint-ID (guest).
     */
    const getHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (accessToken) {
            // Authenticated user - use JWT token
            headers['Authorization'] = `Bearer ${accessToken}`;
        } else if (fingerprintId) {
            // Guest user - use fingerprint
            headers['X-Fingerprint-ID'] = fingerprintId;
        }

        return headers;
    }, [accessToken, fingerprintId]);

    /**
     * Wait for authentication to be ready.
     * If auth isn't ready yet (rare - user is very fast), this will:
     * 1. Wait a short time for the normal auth flow
     * 2. If still not ready, fetch fingerprint directly
     * 
     * Returns true when auth is ready.
     */
    const waitForAuth = useCallback(async (): Promise<boolean> => {
        // Already ready
        if (authReady && (accessToken || fingerprintId)) {
            return true;
        }

        // Wait for the normal auth flow (max 500ms)
        const maxWait = 500;
        const checkInterval = 50;
        let waited = 0;

        while (waited < maxWait) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
            
            // Check if auth became ready
            if (authReady || accessToken || fingerprintId) {
                return true;
            }
        }

        // Auth flow didn't complete in time - fetch fingerprint directly
        if (!isFetching && !accessToken && !fingerprintId) {
            setIsFetching(true);
            try {
                const fp = await getFingerprint();
                dispatch(setFingerprintId(fp));
                return true;
            } catch (error) {
                console.error('Failed to get fingerprint:', error);
                // Create temporary fingerprint as last resort
                const tempFp = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                dispatch(setFingerprintId(tempFp));
                return true;
            } finally {
                setIsFetching(false);
            }
        }

        // Return current ready state
        return !!(accessToken || fingerprintId);
    }, [authReady, accessToken, fingerprintId, isFetching, dispatch]);

    /**
     * Check if auth is ready (has either token or fingerprint).
     * Most components won't need this - use waitForAuth for safety.
     */
    const isReady = authReady && !!(accessToken || fingerprintId);

    return {
        /** Get headers for API requests (Authorization or X-Fingerprint-ID) */
        getHeaders,
        /** Wait for auth to be ready before making API calls */
        waitForAuth,
        /** Whether auth is ready (has token or fingerprint) */
        isReady,
        /** Whether user is authenticated (has session) */
        isAuthenticated,
        /** Whether user is an admin */
        isAdmin,
        /** The fingerprint ID (for logging/analytics) */
        fingerprintId,
        /** The access token (rarely needed directly) */
        accessToken,
    };
}
