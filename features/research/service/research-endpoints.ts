const BASE = '/api/research';

export const RESEARCH_ENDPOINTS = {
    init: `${BASE}/init`,
    templates: {
        list: `${BASE}/templates/list`,
        create: `${BASE}/templates`,
        detail: (templateId: string) => `${BASE}/templates/${templateId}`,
    },
    extension: {
        scrapeQueue: `${BASE}/extension/scrape-queue`,
    },
    project: (projectId: string) => ({
        state: `${BASE}/${projectId}`,
        suggest: `${BASE}/${projectId}/suggest`,
        run: `${BASE}/${projectId}/run`,
        search: `${BASE}/${projectId}/search`,
        scrape: `${BASE}/${projectId}/scrape`,
        analyzeAll: `${BASE}/${projectId}/analyze-all`,
        synthesize: `${BASE}/${projectId}/synthesize`,
        synthesis: `${BASE}/${projectId}/synthesis`,
        costs: `${BASE}/${projectId}/costs`,
        keywords: {
            list: `${BASE}/${projectId}/keywords`,
            add: `${BASE}/${projectId}/keywords`,
            delete: (keywordId: string) => `${BASE}/${projectId}/keywords/${keywordId}`,
        },
        sources: {
            list: `${BASE}/${projectId}/sources`,
            update: (sourceId: string) => `${BASE}/${projectId}/sources/${sourceId}`,
            bulk: `${BASE}/${projectId}/sources/bulk`,
            content: (sourceId: string) => `${BASE}/${projectId}/sources/${sourceId}/content`,
            analyze: (sourceId: string) => `${BASE}/${projectId}/sources/${sourceId}/analyze`,
            tags: (sourceId: string) => `${BASE}/${projectId}/sources/${sourceId}/tags`,
            suggestTags: (sourceId: string) => `${BASE}/${projectId}/sources/${sourceId}/suggest-tags`,
            transcribe: (sourceId: string) => `${BASE}/${projectId}/sources/${sourceId}/transcribe`,
            extensionContent: (sourceId: string) => `${BASE}/${projectId}/sources/${sourceId}/extension-content`,
            upload: `${BASE}/${projectId}/sources/upload`,
        },
        content: {
            edit: (contentId: string) => `${BASE}/${projectId}/content/${contentId}`,
        },
        tags: {
            list: `${BASE}/${projectId}/tags`,
            create: `${BASE}/${projectId}/tags`,
            update: (tagId: string) => `${BASE}/${projectId}/tags/${tagId}`,
            delete: (tagId: string) => `${BASE}/${projectId}/tags/${tagId}`,
            consolidate: (tagId: string) => `${BASE}/${projectId}/tags/${tagId}/consolidate`,
        },
        document: {
            get: `${BASE}/${projectId}/document`,
            generate: `${BASE}/${projectId}/document`,
            versions: `${BASE}/${projectId}/document/versions`,
            export: `${BASE}/${projectId}/document/export`,
        },
        links: {
            list: `${BASE}/${projectId}/links`,
            addToScope: `${BASE}/${projectId}/links/add-to-scope`,
        },
        media: {
            list: `${BASE}/${projectId}/media`,
            update: (mediaId: string) => `${BASE}/${projectId}/media/${mediaId}`,
        },
    }),
} as const;
