'use client';

import { useCallback } from 'react';
import { useBackendApi } from '@/hooks/useBackendApi';
import { RESEARCH_ENDPOINTS } from '../service/research-endpoints';
import { updateSource } from '../service';
import type {
    TopicCreate,
    KeywordCreate,
    ContentEditRequest,
    ContentPasteRequest,
    AnalyzeRequest,
    AnalyzeBulkRequest,
    SynthesisRequest,
    SuggestRequest,
    AddLinksToScope,
} from '../types';

export function useResearchApi() {
    const api = useBackendApi();

    const endpoints = useCallback((topicId: string) => RESEARCH_ENDPOINTS.topic(topicId), []);

    return {
        ...api,

        // --- Suggest (top-level, no topic needed) ---
        suggest: (body: SuggestRequest) =>
            api.post(RESEARCH_ENDPOINTS.suggest, body),

        // --- Topic CRUD (project-scoped) ---
        createTopic: (projectId: string, body: TopicCreate) =>
            api.post(RESEARCH_ENDPOINTS.projects.createTopic(projectId), body),

        // --- Topic State (computed progress from Python) ---
        getTopicState: (topicId: string, signal?: AbortSignal) =>
            api.get(endpoints(topicId).state, signal),

        // --- Pipeline ---
        runPipeline: (topicId: string, signal?: AbortSignal) =>
            api.post(endpoints(topicId).run, {}, signal),

        triggerSearch: (topicId: string, signal?: AbortSignal) =>
            api.post(endpoints(topicId).search, {}, signal),

        triggerScrape: (topicId: string, signal?: AbortSignal) =>
            api.post(endpoints(topicId).scrape, {}, signal),

        analyzeAll: (topicId: string, body?: AnalyzeBulkRequest, signal?: AbortSignal) =>
            api.post(endpoints(topicId).analyzeAll, body ?? { agent_type: 'page_summary' }, signal),

        synthesize: (topicId: string, body: SynthesisRequest, signal?: AbortSignal) =>
            api.post(endpoints(topicId).synthesize, body, signal),

        // --- Keywords (Python for validation + project_id resolution) ---
        addKeywords: (topicId: string, body: KeywordCreate) =>
            api.post(endpoints(topicId).keywords.add, body),

        // --- Source Actions ---

        // Sets the source back to pending then triggers the topic scrape endpoint,
        // which picks up all pending sources. Returns a Response for stream consumption.
        scrapeSource: async (topicId: string, sourceId: string): Promise<Response> => {
            await updateSource(sourceId, { scrape_status: 'pending' });
            return api.post(endpoints(topicId).scrape, {});
        },

        analyzeSource: (topicId: string, sourceId: string, body?: AnalyzeRequest) =>
            api.post(endpoints(topicId).sources.analyze(sourceId), body ?? { agent_type: 'page_summary' }),

        transcribeSource: (topicId: string, sourceId: string) =>
            api.post(endpoints(topicId).sources.transcribe(sourceId), {}),

        uploadFile: (topicId: string, formData: FormData) =>
            api.upload(endpoints(topicId).sources.upload, formData),

        // --- Content (Python for versioning + hashing) ---
        editContent: (topicId: string, contentId: string, body: ContentEditRequest) =>
            api.fetch(endpoints(topicId).content.edit(contentId), { method: 'PATCH', body: JSON.stringify(body) }),

        pasteContent: (topicId: string, sourceId: string, body: ContentPasteRequest) =>
            api.post(endpoints(topicId).content.paste(sourceId), body),

        // --- Tags (Python for LLM actions) ---
        suggestTags: (topicId: string, sourceId: string) =>
            api.post(endpoints(topicId).sources.suggestTags(sourceId), {}),

        consolidateTag: (topicId: string, tagId: string) =>
            api.post(endpoints(topicId).tags.consolidate(tagId), {}),

        // --- Document (Python for LLM generation) ---
        generateDocument: (topicId: string) =>
            api.post(endpoints(topicId).document.generate, {}),

        // --- Links (Python for aggregation + business logic) ---
        getLinks: (topicId: string, signal?: AbortSignal) =>
            api.get(endpoints(topicId).links, signal),

        addLinksToScope: (topicId: string, body: AddLinksToScope) =>
            api.post(endpoints(topicId).linksAddToScope, body),

        // --- Analysis Retry ---
        retryAnalysis: (topicId: string, analysisId: string) =>
            api.post(endpoints(topicId).analyses.retry(analysisId), {}),

        retryFailedAnalyses: (topicId: string) =>
            api.post(endpoints(topicId).analyses.retryFailed, {}),

        // --- Costs (Python for multi-table aggregation) ---
        getCosts: (topicId: string, signal?: AbortSignal) =>
            api.get(endpoints(topicId).costs, signal),

        // --- Templates (Python) ---
        getTemplates: (signal?: AbortSignal) =>
            api.get(RESEARCH_ENDPOINTS.templates.list, signal),
    };
}
