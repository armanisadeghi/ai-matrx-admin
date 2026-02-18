// hooks/useAdminOverride.ts
// Unified admin localhost detection and backend URL resolution.
// Single source of truth — replaces scattered logic in AdminMenu,
// useApiTestConfig, and useAgentChat.
'use client';

import { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    selectServerOverride,
    selectIsUsingLocalhost,
    setServerOverride,
    type ServerEnvironment,
} from '@/lib/redux/slices/adminPreferencesSlice';
import { selectIsAdmin, selectAuthReady } from '@/lib/redux/slices/userSlice';
// Note: selectAuthReady is still used to gate the isAdmin return value
import { BACKEND_URLS, ENDPOINTS } from '@/lib/api/endpoints';

const HEALTH_CHECK_TIMEOUT_MS = 3000;

/**
 * Check if a backend server is healthy.
 * Returns true if we get ANY response (even error) — the server is running.
 */
async function checkServerHealth(baseUrl: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
        await fetch(`${baseUrl}${ENDPOINTS.health.check}`, {
            method: 'GET',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return true;
    } catch {
        return false;
    }
}

async function checkLocalhostHealth(): Promise<boolean> {
    return checkServerHealth(BACKEND_URLS.localhost);
}

/**
 * Unified admin localhost override hook.
 *
 * Always starts with production URL — no automatic localhost detection.
 * Localhost is only checked when the admin explicitly selects it via AdminMenu,
 * which first shows a confirmation dialog explaining the browser permission prompt.
 *
 * Usage:
 * ```tsx
 * const { backendUrl, isLocalhost, isChecking } = useAdminOverride();
 * ```
 */
export function useAdminOverride() {
    const dispatch = useDispatch();
    const isAdmin = useSelector(selectIsAdmin);
    const authReady = useSelector(selectAuthReady);
    const serverOverride = useSelector(selectServerOverride);
    const isLocalhost = useSelector(selectIsUsingLocalhost);
    const [isChecking, setIsChecking] = useState(false);

    // Resolve backend URL from Redux state
    const backendUrl = isLocalhost
        ? BACKEND_URLS.localhost
        : BACKEND_URLS.production;

    // Localhost auto-detection intentionally removed.
    // The browser prompts for local network permission when fetching localhost,
    // which is disruptive on login. Localhost is now only checked when the admin
    // explicitly selects it via the AdminMenu.

    // Manual server switch (for AdminMenu and test panels)
    const setServer = useCallback(
        async (server: ServerEnvironment | null) => {
            if (server === 'localhost') {
                setIsChecking(true);
                const healthy = await checkLocalhostHealth();
                setIsChecking(false);
                if (!healthy) {
                    return false; // Caller can show toast
                }
            }
            dispatch(setServerOverride(server));
            return true;
        },
        [dispatch],
    );

    // Reset to production
    const resetToProduction = useCallback(() => {
        dispatch(setServerOverride(null));
    }, [dispatch]);

    return {
        /** Current backend URL (production or localhost) */
        backendUrl,
        /** Whether localhost is active */
        isLocalhost,
        /** Whether a health check is in progress */
        isChecking,
        /** Whether user is admin (controls visibility of override UI) */
        isAdmin: isAdmin && authReady,
        /** Current server override value from Redux */
        serverOverride,
        /** Manually set server (validates localhost health first). Returns false if unhealthy. */
        setServer,
        /** Reset to production */
        resetToProduction,
        /** Re-check localhost health and update if healthy */
        recheckLocalhost: useCallback(async () => {
            setIsChecking(true);
            const healthy = await checkLocalhostHealth();
            if (healthy && !isLocalhost) {
                dispatch(setServerOverride('localhost'));
            } else if (!healthy && isLocalhost) {
                dispatch(setServerOverride(null));
            }
            setIsChecking(false);
            return healthy;
        }, [dispatch, isLocalhost]),
        /** Check health of any server by key */
        checkHealth: useCallback(async (server: 'production' | 'localhost') => {
            const url = server === 'localhost' ? BACKEND_URLS.localhost : BACKEND_URLS.production;
            return checkServerHealth(url);
        }, []),
    };
}
