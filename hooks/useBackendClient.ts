// hooks/useBackendClient.ts
// Main React hook for the backend API client.
// Wires together auth (Redux), scope (URL), and admin override.
'use client';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectAccessToken, selectFingerprintId, selectAuthReady } from '@/lib/redux/slices/userSlice';
import { BackendClient } from '@/lib/api/backend-client';
import type { AuthCredentials, ContextScope } from '@/lib/api/types';
import { useContextScope } from './useContextScope';
import { useAdminOverride } from './useAdminOverride';

// ============================================================================
// MAIN HOOK
// ============================================================================

interface UseBackendClientOptions {
    /** Override scope instead of reading from URL params */
    scopeOverride?: ContextScope;
    /** Override auth token (for admin testing with different tokens) */
    tokenOverride?: string;
    /** Override base URL directly (bypasses admin override) */
    urlOverride?: string;
}

/**
 * React hook that creates a ready-to-use BackendClient.
 *
 * Automatically wires:
 * - Auth: JWT token or fingerprint from Redux
 * - Scope: org/project/task from URL search params
 * - URL: production or localhost from admin override
 *
 * Usage:
 * ```tsx
 * const { client, isReady, backendUrl, scope } = useBackendClient();
 *
 * // Simple JSON request
 * const data = await client.postJson(ENDPOINTS.ai.agentWarm, { prompt_id: 'abc' });
 *
 * // Streaming request
 * for await (const event of client.stream(ENDPOINTS.ai.agentExecute, body)) {
 *   // handle events
 * }
 * ```
 */
export function useBackendClient(options: UseBackendClientOptions = {}) {
    const accessToken = useSelector(selectAccessToken);
    const fingerprintId = useSelector(selectFingerprintId);
    const authReady = useSelector(selectAuthReady);
    const { scope: urlScope } = useContextScope();
    const {
        backendUrl: adminUrl,
        isLocalhost,
        isChecking: isCheckingLocalhost,
        isAdmin,
    } = useAdminOverride();

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

    // Resolve URL
    const baseUrl = options.urlOverride || adminUrl;

    // Create memoized client instance
    const client = useMemo(
        () => new BackendClient({ baseUrl, auth, scope }),
        [baseUrl, auth, scope],
    );

    // Auth is ready when we have either token or fingerprint
    const isReady = authReady && auth.type !== 'anonymous';

    return {
        /** Ready-to-use BackendClient instance */
        client,
        /** Current backend URL */
        backendUrl: baseUrl,
        /** Whether auth is resolved (has token or fingerprint) */
        isReady,
        /** Whether admin localhost override is active */
        isLocalhost,
        /** Whether localhost health check is in progress */
        isCheckingLocalhost,
        /** Whether current user is admin */
        isAdmin,
        /** Current org/project/task scope */
        scope,
        /** The resolved auth credentials */
        auth,
    };
}

// ============================================================================
// LIGHTWEIGHT VARIANT — No scope, no admin override
// ============================================================================

/**
 * Minimal backend client hook for simple use cases.
 * Uses auth from Redux but skips scope and admin override.
 * Lighter weight — doesn't read URL params or trigger admin detection.
 */
export function useSimpleBackendClient(baseUrl?: string) {
    const accessToken = useSelector(selectAccessToken);
    const fingerprintId = useSelector(selectFingerprintId);
    const authReady = useSelector(selectAuthReady);

    const auth: AuthCredentials = useMemo(() => {
        if (accessToken) return { type: 'token', token: accessToken };
        if (fingerprintId) return { type: 'fingerprint', fingerprintId };
        return { type: 'anonymous' };
    }, [accessToken, fingerprintId]);

    const client = useMemo(
        () => new BackendClient({ baseUrl, auth }),
        [baseUrl, auth],
    );

    return {
        client,
        isReady: authReady && auth.type !== 'anonymous',
    };
}
