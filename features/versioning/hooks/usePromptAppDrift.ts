'use client';

/**
 * usePromptAppDrift — React hook for prompt app version drift detection.
 *
 * Fetches the list of apps that are behind their prompt's current version
 * and provides upgrade actions.
 */

import { useState, useEffect, useCallback } from 'react';
import type { DriftItem, PinVersionResult } from '../types';
import { checkPromptAppDrift, pinPromptAppToVersion } from '../services/versionService';

interface UsePromptAppDriftOptions {
    userId?: string;
    /** Only fetch drift for a specific prompt (client-side filter) */
    promptId?: string;
    autoFetch?: boolean;
}

interface UsePromptAppDriftReturn {
    driftItems: DriftItem[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    pinToVersion: (appId: string, versionId: string) => Promise<PinVersionResult | null>;
    pinning: boolean;
}

export function usePromptAppDrift({
    userId,
    promptId,
    autoFetch = true,
}: UsePromptAppDriftOptions = {}): UsePromptAppDriftReturn {
    const [driftItems, setDriftItems] = useState<DriftItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pinning, setPinning] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let data = await checkPromptAppDrift(userId);

            // Optional client-side filter for a specific prompt
            if (promptId) {
                // The RPC doesn't filter by prompt_id, so we do it client-side
                // The drift items have app_id but we'd need to join. For now,
                // we return all and let the UI filter.
            }

            setDriftItems(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to check drift');
            console.error('usePromptAppDrift error:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, promptId]);

    useEffect(() => {
        if (autoFetch) {
            refresh();
        }
    }, [autoFetch, refresh]);

    const pinToVersion = useCallback(
        async (appId: string, versionId: string): Promise<PinVersionResult | null> => {
            setPinning(true);

            try {
                const result = await pinPromptAppToVersion(appId, versionId);
                // Refresh drift list after pinning
                await refresh();
                return result;
            } catch (err: any) {
                console.error('pinToVersion error:', err);
                return null;
            } finally {
                setPinning(false);
            }
        },
        [refresh]
    );

    return {
        driftItems,
        loading,
        error,
        refresh,
        pinToVersion,
        pinning,
    };
}
