'use client';

import { useState, useEffect, useCallback } from 'react';
import * as service from '../service';
import type {
    ResearchTopic,
    ResearchKeyword,
    ResearchSource,
    ResearchContent,
    ResearchSynthesis,
    ResearchTag,
    ResearchDocument,
    ResearchMedia,
    ResearchTemplate,
    SourceFilters,
} from '../types';

// ============================================================================
// Generic fetch hook
// ============================================================================

interface UseQueryResult<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

function useServiceQuery<T>(
    fetcher: () => Promise<T>,
    deps: unknown[],
    enabled = true,
): UseQueryResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

    useEffect(() => {
        if (!enabled) {
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        fetcher()
            .then(result => {
                if (!cancelled) setData(result);
            })
            .catch(err => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, refreshKey, ...deps]);

    return { data, isLoading, error, refresh };
}

// ============================================================================
// Topic hooks
// ============================================================================

export function useTopicsForProject(projectId: string | undefined) {
    return useServiceQuery<ResearchTopic[]>(
        () => service.getTopicsForProject(projectId!),
        [projectId],
        !!projectId,
    );
}

export function useTopicsForProjects(projectIds: string[]) {
    const key = projectIds.join(',');
    return useServiceQuery<ResearchTopic[]>(
        () => service.getTopicsForProjects(projectIds),
        [key],
        projectIds.length > 0,
    );
}

export function useTopic(topicId: string | undefined) {
    return useServiceQuery<ResearchTopic | null>(
        () => service.getTopic(topicId!),
        [topicId],
        !!topicId,
    );
}

// ============================================================================
// Keyword hooks
// ============================================================================

export function useResearchKeywords(topicId: string) {
    return useServiceQuery<ResearchKeyword[]>(
        () => service.getKeywords(topicId),
        [topicId],
        !!topicId,
    );
}

// ============================================================================
// Source hooks
// ============================================================================

export function useResearchSource(sourceId: string | undefined) {
    return useServiceQuery<ResearchSource | null>(
        () => service.getSource(sourceId!),
        [sourceId],
        !!sourceId,
    );
}

export function useResearchSources(topicId: string, filters?: Partial<SourceFilters>) {
    const filterKey = filters ? JSON.stringify(filters) : 'all';
    return useServiceQuery<ResearchSource[]>(
        () => service.getSources(topicId, filters),
        [topicId, filterKey],
        !!topicId,
    );
}

// ============================================================================
// Content hooks
// ============================================================================

export function useSourceContent(sourceId: string) {
    return useServiceQuery<ResearchContent[]>(
        () => service.getSourceContent(sourceId),
        [sourceId],
        !!sourceId,
    );
}

// ============================================================================
// Synthesis hooks
// ============================================================================

export function useResearchSynthesis(topicId: string, params?: { scope?: string; keyword_id?: string }) {
    const paramsKey = params ? JSON.stringify(params) : 'all';
    return useServiceQuery<ResearchSynthesis[]>(
        () => service.getSynthesis(topicId, params),
        [topicId, paramsKey],
        !!topicId,
    );
}

// ============================================================================
// Tag hooks
// ============================================================================

export function useResearchTags(topicId: string) {
    return useServiceQuery<ResearchTag[]>(
        () => service.getTags(topicId),
        [topicId],
        !!topicId,
    );
}

// ============================================================================
// Document hooks
// ============================================================================

export function useResearchDocument(topicId: string) {
    return useServiceQuery<ResearchDocument | null>(
        () => service.getDocument(topicId),
        [topicId],
        !!topicId,
    );
}

export function useDocumentVersions(topicId: string) {
    return useServiceQuery<ResearchDocument[]>(
        () => service.getDocumentVersions(topicId),
        [topicId],
        !!topicId,
    );
}

// ============================================================================
// Media hooks
// ============================================================================

export function useResearchMedia(topicId: string) {
    return useServiceQuery<ResearchMedia[]>(
        () => service.getMedia(topicId),
        [topicId],
        !!topicId,
    );
}

// ============================================================================
// Template hooks
// ============================================================================

export function useResearchTemplates() {
    return useServiceQuery<ResearchTemplate[]>(
        () => service.getTemplates(),
        [],
    );
}
