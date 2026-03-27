// hooks/useBackendClient.ts
// React hook for the backend API client.
// Wires together auth (Redux userSlice), scope (URL params), and active server
// URL (Redux apiConfigSlice — single source of truth).
'use client';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectFingerprintId, selectAuthReady, selectIsAdmin } from '@/lib/redux/slices/userSlice';
import { selectResolvedBaseUrl } from '@/lib/redux/slices/apiConfigSlice';
import { BackendClient } from '@/lib/api/backend-client';
import type { AuthCredentials, ContextScope } from '@/lib/api/types';
import { useContextScope } from './useContextScope';

// ============================================================================
// MAIN HOOK
// ============================================================================

interface UseBackendClientOptions {
    /** Override scope instead of reading from URL params */
    scopeOverride?: ContextScope;
    /** Override auth token (for admin testing with different tokens) */
    tokenOverride?: string;
    /** Override base URL directly (bypasses Redux — use sparingly) */
    urlOverride?: string;
}

/**
 * React hook that creates a ready-to-use BackendClient.
 *
 * Automatically wires:
 * - Auth: JWT token or fingerprint from Redux userSlice
 * - Scope: org/project/task from URL search params
 * - URL: active server from Redux apiConfigSlice (all environments supported)
 *
 * Usage:
 * ```tsx
 * const { client, isReady, backendUrl } = useBackendClient();
 * await client.postJson(ENDPOINTS.ai.agentWarm(promptId));
 * ```
 */
export function useBackendClient(options: UseBackendClientOptions = {}) {
    const accessToken = useSelector(selectAccessToken);
    const fingerprintId = useSelector(selectFingerprintId);
    const authReady = useSelector(selectAuthReady);
    const isAdmin = useSelector(selectIsAdmin);
    const resolvedUrl = useSelector(selectResolvedBaseUrl);
    const { scope: urlScope } = useContextScope();

    // Resolve auth credentials
    const auth: AuthCredentials = useMemo(() => {
        if (options.tokenOverride) {
            return { type: 'token', token: options.tokenOverride };
        }
        if (accessToken) {
            return { type: 'token', token: accessToken };
        }
        if (fingerprintId) {
            return { type: 'fingerprint', fingerprintId };
        }
        return { type: 'anonymous' };
    }, [accessToken, fingerprintId, options.tokenOverride]);

    // Resolve scope
    const scope: ContextScope = options.scopeOverride || urlScope;

    // URL: explicit override wins, then Redux apiConfigSlice
    const baseUrl = options.urlOverride || resolvedUrl || '';

    // Create memoized client instance
    const client = useMemo(
        () => new BackendClient({ baseUrl, auth, scope }),
        [baseUrl, auth, scope],
    );

    const isReady = authReady && auth.type !== 'anonymous';

    return {
        /** Ready-to-use BackendClient instance */
        client,
        /** Current backend URL */
        backendUrl: baseUrl,
        /** Whether auth is resolved (has token or fingerprint) */
        isReady,
        /** Whether current user is admin */
        isAdmin,
        /** Current org/project/task scope */
        scope,
        /** The resolved auth credentials */
        auth,
    };
}

// ============================================================================
// LIGHTWEIGHT VARIANT — No scope
// ============================================================================

/**
 * Minimal backend client hook for simple use cases.
 * Uses auth and URL from Redux but skips scope.
 */
export function useSimpleBackendClient(baseUrlOverride?: string) {
    const accessToken = useSelector(selectAccessToken);
    const fingerprintId = useSelector(selectFingerprintId);
    const authReady = useSelector(selectAuthReady);
    const resolvedUrl = useSelector(selectResolvedBaseUrl);

    const auth: AuthCredentials = useMemo(() => {
        if (accessToken) return { type: 'token', token: accessToken };
        if (fingerprintId) return { type: 'fingerprint', fingerprintId };
        return { type: 'anonymous' };
    }, [accessToken, fingerprintId]);

    const baseUrl = baseUrlOverride || resolvedUrl || '';

    const client = useMemo(
        () => new BackendClient({ baseUrl, auth }),
        [baseUrl, auth],
    );

    return {
        client,
        isReady: authReady && auth.type !== 'anonymous',
    };
}
