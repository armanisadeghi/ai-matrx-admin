'use client';

import { useCallback } from 'react';
import { useBackendApi } from '@/hooks/useBackendApi';
import { RESEARCH_ENDPOINTS } from '../service/research-endpoints';
import type {
    ResearchConfigCreate,
    ResearchConfigUpdate,
    KeywordCreate,
    SourceUpdate,
    SourceBulkAction,
    SourceTagRequest,
    ContentEditRequest,
    ContentPasteRequest,
    AnalyzeRequest,
    AnalyzeBulkRequest,
    SynthesisRequest,
    SuggestRequest,
    TagCreate,
    TagUpdate,
    AddLinksToScope,
    MediaUpdate,
    SourceFilters,
} from '../types';

export function useResearchApi() {
    const api = useBackendApi();

    const endpoints = useCallback((projectId: string) => RESEARCH_ENDPOINTS.project(projectId), []);

    return {
        ...api,

        // --- Init & Config ---
        initResearch: (body: ResearchConfigCreate) =>
            api.post(RESEARCH_ENDPOINTS.init, body),

        getResearchState: (projectId: string, signal?: AbortSignal) =>
            api.get(endpoints(projectId).state, signal),

        updateConfig: (projectId: string, body: ResearchConfigUpdate) =>
            api.fetch(endpoints(projectId).state, { method: 'PATCH', body: JSON.stringify(body) }),

        suggest: (projectId: string, body: SuggestRequest) =>
            api.post(endpoints(projectId).suggest, body),

        // --- Pipeline ---
        runPipeline: (projectId: string, signal?: AbortSignal) =>
            api.post(endpoints(projectId).run, {}, signal),

        triggerSearch: (projectId: string, signal?: AbortSignal) =>
            api.post(endpoints(projectId).search, {}, signal),

        triggerScrape: (projectId: string, signal?: AbortSignal) =>
            api.post(endpoints(projectId).scrape, {}, signal),

        analyzeAll: (projectId: string, body?: AnalyzeBulkRequest, signal?: AbortSignal) =>
            api.post(endpoints(projectId).analyzeAll, body ?? { agent_type: 'page_summary' }, signal),

        synthesize: (projectId: string, body: SynthesisRequest, signal?: AbortSignal) =>
            api.post(endpoints(projectId).synthesize, body, signal),

        getSynthesis: (projectId: string, params?: string, signal?: AbortSignal) =>
            api.get(`${endpoints(projectId).synthesis}${params ? `?${params}` : ''}`, signal),

        // --- Keywords ---
        getKeywords: (projectId: string, signal?: AbortSignal) =>
            api.get(endpoints(projectId).keywords.list, signal),

        addKeywords: (projectId: string, body: KeywordCreate) =>
            api.post(endpoints(projectId).keywords.add, body),

        deleteKeyword: (projectId: string, keywordId: string) =>
            api.fetch(endpoints(projectId).keywords.delete(keywordId), { method: 'DELETE' }),

        // --- Sources ---
        getSources: (projectId: string, filters?: Partial<SourceFilters>, signal?: AbortSignal) => {
            const params = new URLSearchParams();
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        params.set(key, String(value));
                    }
                });
            }
            const qs = params.toString();
            return api.get(`${endpoints(projectId).sources.list}${qs ? `?${qs}` : ''}`, signal);
        },

        updateSource: (projectId: string, sourceId: string, body: SourceUpdate) =>
            api.fetch(endpoints(projectId).sources.update(sourceId), { method: 'PATCH', body: JSON.stringify(body) }),

        bulkUpdateSources: (projectId: string, body: SourceBulkAction) =>
            api.fetch(endpoints(projectId).sources.bulk, { method: 'PATCH', body: JSON.stringify(body) }),

        // --- Content ---
        getSourceContent: (projectId: string, sourceId: string, signal?: AbortSignal) =>
            api.get(endpoints(projectId).sources.content(sourceId), signal),

        pasteContent: (projectId: string, sourceId: string, body: ContentPasteRequest) =>
            api.post(endpoints(projectId).sources.content(sourceId), body),

        editContent: (projectId: string, contentId: string, body: ContentEditRequest) =>
            api.fetch(endpoints(projectId).content.edit(contentId), { method: 'PATCH', body: JSON.stringify(body) }),

        // --- Analysis ---
        analyzeSource: (projectId: string, sourceId: string, body?: AnalyzeRequest) =>
            api.post(endpoints(projectId).sources.analyze(sourceId), body ?? { agent_type: 'page_summary' }),

        // --- Tags ---
        getTags: (projectId: string, signal?: AbortSignal) =>
            api.get(endpoints(projectId).tags.list, signal),

        createTag: (projectId: string, body: TagCreate) =>
            api.post(endpoints(projectId).tags.create, body),

        updateTag: (projectId: string, tagId: string, body: TagUpdate) =>
            api.fetch(endpoints(projectId).tags.update(tagId), { method: 'PATCH', body: JSON.stringify(body) }),

        deleteTag: (projectId: string, tagId: string) =>
            api.fetch(endpoints(projectId).tags.delete(tagId), { method: 'DELETE' }),

        assignTags: (projectId: string, sourceId: string, body: SourceTagRequest) =>
            api.post(endpoints(projectId).sources.tags(sourceId), body),

        suggestTags: (projectId: string, sourceId: string) =>
            api.post(endpoints(projectId).sources.suggestTags(sourceId), {}),

        consolidateTag: (projectId: string, tagId: string) =>
            api.post(endpoints(projectId).tags.consolidate(tagId), {}),

        // --- Document ---
        getDocument: (projectId: string, signal?: AbortSignal) =>
            api.get(endpoints(projectId).document.get, signal),

        generateDocument: (projectId: string) =>
            api.post(endpoints(projectId).document.generate, {}),

        getDocumentVersions: (projectId: string, signal?: AbortSignal) =>
            api.get(endpoints(projectId).document.versions, signal),

        exportDocument: (projectId: string, format = 'json') =>
            api.get(`${endpoints(projectId).document.export}?format=${format}`),

        // --- Links ---
        getLinks: (projectId: string, signal?: AbortSignal) =>
            api.get(endpoints(projectId).links.list, signal),

        addLinksToScope: (projectId: string, body: AddLinksToScope) =>
            api.post(endpoints(projectId).links.addToScope, body),

        // --- Media ---
        getMedia: (projectId: string, params?: string, signal?: AbortSignal) =>
            api.get(`${endpoints(projectId).media.list}${params ? `?${params}` : ''}`, signal),

        updateMedia: (projectId: string, mediaId: string, body: MediaUpdate) =>
            api.fetch(endpoints(projectId).media.update(mediaId), { method: 'PATCH', body: JSON.stringify(body) }),

        // --- Misc ---
        transcribeSource: (projectId: string, sourceId: string) =>
            api.post(endpoints(projectId).sources.transcribe(sourceId), {}),

        uploadFile: (projectId: string, formData: FormData) =>
            api.upload(endpoints(projectId).sources.upload, formData),

        getCosts: (projectId: string, signal?: AbortSignal) =>
            api.get(endpoints(projectId).costs, signal),

        // --- Templates ---
        getTemplates: (signal?: AbortSignal) =>
            api.get(RESEARCH_ENDPOINTS.templates.list, signal),

        getTemplate: (templateId: string, signal?: AbortSignal) =>
            api.get(RESEARCH_ENDPOINTS.templates.detail(templateId), signal),
    };
}
