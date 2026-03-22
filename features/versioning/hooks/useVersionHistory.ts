'use client';

/**
 * useVersionHistory — React hook for version history management.
 *
 * Provides version listing, snapshot loading, diff comparison,
 * and promote actions for any versioned entity.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
    VersionEntityType,
    VersionHistoryItem,
    VersionSnapshot,
    VersionDiff,
    PromoteVersionResult,
} from '../types';
import {
    getVersionHistory,
    getVersionSnapshot,
    getVersionDiff,
    promoteVersion,
} from '../services/versionService';

interface UseVersionHistoryOptions {
    entityType: VersionEntityType;
    entityId: string | null | undefined;
    limit?: number;
    /** Set to false to skip auto-fetching on mount */
    autoFetch?: boolean;
}

interface UseVersionHistoryReturn {
    // Version list
    versions: VersionHistoryItem[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;

    // Snapshot
    snapshot: VersionSnapshot | null;
    snapshotLoading: boolean;
    snapshotVersion: number | null;
    loadSnapshot: (version: number) => Promise<VersionSnapshot | null>;
    clearSnapshot: () => void;

    // Diff
    diff: VersionDiff | null;
    diffLoading: boolean;
    diffVersions: [number, number] | null;
    loadDiff: (versionA: number, versionB: number) => Promise<VersionDiff | null>;
    clearDiff: () => void;

    // Actions
    promote: (version: number) => Promise<PromoteVersionResult | null>;
    promoting: boolean;
}

export function useVersionHistory({
    entityType,
    entityId,
    limit = 50,
    autoFetch = true,
}: UseVersionHistoryOptions): UseVersionHistoryReturn {
    // Version list state
    const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Snapshot state
    const [snapshot, setSnapshot] = useState<VersionSnapshot | null>(null);
    const [snapshotLoading, setSnapshotLoading] = useState(false);
    const [snapshotVersion, setSnapshotVersion] = useState<number | null>(null);

    // Diff state
    const [diff, setDiff] = useState<VersionDiff | null>(null);
    const [diffLoading, setDiffLoading] = useState(false);
    const [diffVersions, setDiffVersions] = useState<[number, number] | null>(null);

    // Promote state
    const [promoting, setPromoting] = useState(false);

    // Fetch version list
    const refresh = useCallback(async () => {
        if (!entityId) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getVersionHistory(entityType, entityId, limit);
            setVersions(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to load version history');
            console.error('useVersionHistory error:', err);
        } finally {
            setLoading(false);
        }
    }, [entityType, entityId, limit]);

    // Auto-fetch on mount / dependency change
    useEffect(() => {
        if (autoFetch && entityId) {
            refresh();
        }
    }, [autoFetch, entityId, refresh]);

    // Load snapshot
    const loadSnapshot = useCallback(
        async (version: number): Promise<VersionSnapshot | null> => {
            if (!entityId) return null;

            setSnapshotLoading(true);
            setSnapshotVersion(version);

            try {
                const data = await getVersionSnapshot(entityType, entityId, version);
                setSnapshot(data);
                return data;
            } catch (err: any) {
                console.error('loadSnapshot error:', err);
                setSnapshot(null);
                return null;
            } finally {
                setSnapshotLoading(false);
            }
        },
        [entityType, entityId]
    );

    const clearSnapshot = useCallback(() => {
        setSnapshot(null);
        setSnapshotVersion(null);
    }, []);

    // Load diff
    const loadDiff = useCallback(
        async (versionA: number, versionB: number): Promise<VersionDiff | null> => {
            if (!entityId) return null;

            setDiffLoading(true);
            setDiffVersions([versionA, versionB]);

            try {
                const data = await getVersionDiff(entityType, entityId, versionA, versionB);
                setDiff(data);
                return data;
            } catch (err: any) {
                console.error('loadDiff error:', err);
                setDiff(null);
                return null;
            } finally {
                setDiffLoading(false);
            }
        },
        [entityType, entityId]
    );

    const clearDiff = useCallback(() => {
        setDiff(null);
        setDiffVersions(null);
    }, []);

    // Promote version
    const promote = useCallback(
        async (version: number): Promise<PromoteVersionResult | null> => {
            if (!entityId) return null;

            setPromoting(true);

            try {
                const result = await promoteVersion(entityType, entityId, version);
                // Refresh the version list after promotion
                await refresh();
                return result;
            } catch (err: any) {
                console.error('promote error:', err);
                return null;
            } finally {
                setPromoting(false);
            }
        },
        [entityType, entityId, refresh]
    );

    return {
        versions,
        loading,
        error,
        refresh,

        snapshot,
        snapshotLoading,
        snapshotVersion,
        loadSnapshot,
        clearSnapshot,

        diff,
        diffLoading,
        diffVersions,
        loadDiff,
        clearDiff,

        promote,
        promoting,
    };
}
