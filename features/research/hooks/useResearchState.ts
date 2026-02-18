'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useResearchApi } from './useResearchApi';
import type { ResearchState } from '../types';

const RESEARCH_STATE_KEY = 'research-state';

export function useResearchState(projectId: string, options?: { pollInterval?: number }) {
    const api = useResearchApi();
    const queryClient = useQueryClient();

    const query = useQuery<ResearchState>({
        queryKey: [RESEARCH_STATE_KEY, projectId],
        queryFn: async ({ signal }) => {
            const response = await api.getResearchState(projectId, signal);
            return response.json();
        },
        refetchInterval: options?.pollInterval,
        enabled: !!projectId,
        staleTime: 5_000,
    });

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: [RESEARCH_STATE_KEY, projectId] });

    return {
        ...query,
        state: query.data ?? null,
        config: query.data?.config ?? null,
        progress: query.data?.progress ?? null,
        invalidate,
    };
}

export function useResearchKeywords(projectId: string) {
    const api = useResearchApi();

    return useQuery({
        queryKey: ['research-keywords', projectId],
        queryFn: async ({ signal }) => {
            const response = await api.getKeywords(projectId, signal);
            return response.json();
        },
        enabled: !!projectId,
        staleTime: 10_000,
    });
}

export function useResearchSources(projectId: string, filters?: Record<string, unknown>) {
    const api = useResearchApi();
    const filterKey = filters ? JSON.stringify(filters) : 'all';

    return useQuery({
        queryKey: ['research-sources', projectId, filterKey],
        queryFn: async ({ signal }) => {
            const response = await api.getSources(projectId, filters as Record<string, string | number | boolean>, signal);
            return response.json();
        },
        enabled: !!projectId,
        staleTime: 5_000,
    });
}

export function useResearchTags(projectId: string) {
    const api = useResearchApi();

    return useQuery({
        queryKey: ['research-tags', projectId],
        queryFn: async ({ signal }) => {
            const response = await api.getTags(projectId, signal);
            return response.json();
        },
        enabled: !!projectId,
        staleTime: 10_000,
    });
}

export function useResearchDocument(projectId: string) {
    const api = useResearchApi();

    return useQuery({
        queryKey: ['research-document', projectId],
        queryFn: async ({ signal }) => {
            const response = await api.getDocument(projectId, signal);
            return response.json();
        },
        enabled: !!projectId,
        staleTime: 30_000,
    });
}

export function useResearchCosts(projectId: string) {
    const api = useResearchApi();

    return useQuery({
        queryKey: ['research-costs', projectId],
        queryFn: async ({ signal }) => {
            const response = await api.getCosts(projectId, signal);
            return response.json();
        },
        enabled: !!projectId,
        staleTime: 30_000,
    });
}

export function useResearchTemplates() {
    const api = useResearchApi();

    return useQuery({
        queryKey: ['research-templates'],
        queryFn: async ({ signal }) => {
            const response = await api.getTemplates(signal);
            return response.json();
        },
        staleTime: 60_000,
    });
}

export function useSourceContent(projectId: string, sourceId: string) {
    const api = useResearchApi();

    return useQuery({
        queryKey: ['research-source-content', projectId, sourceId],
        queryFn: async ({ signal }) => {
            const response = await api.getSourceContent(projectId, sourceId, signal);
            return response.json();
        },
        enabled: !!projectId && !!sourceId,
        staleTime: 10_000,
    });
}

export function useResearchLinks(projectId: string) {
    const api = useResearchApi();

    return useQuery({
        queryKey: ['research-links', projectId],
        queryFn: async ({ signal }) => {
            const response = await api.getLinks(projectId, signal);
            return response.json();
        },
        enabled: !!projectId,
        staleTime: 15_000,
    });
}

export function useResearchMedia(projectId: string, params?: string) {
    const api = useResearchApi();

    return useQuery({
        queryKey: ['research-media', projectId, params],
        queryFn: async ({ signal }) => {
            const response = await api.getMedia(projectId, params, signal);
            return response.json();
        },
        enabled: !!projectId,
        staleTime: 15_000,
    });
}
