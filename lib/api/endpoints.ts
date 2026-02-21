// lib/api/endpoints.ts
// Single source of truth for all Python FastAPI backend endpoint paths.
// Import ENDPOINTS from this file — never hardcode paths.

/**
 * All backend API endpoint paths.
 *
 * Organized by feature area matching the backend router structure.
 * Use these constants everywhere instead of hardcoded strings.
 *
 * Auth tiers:
 * - Public: No auth required
 * - Guest OK: Fingerprint or JWT token
 * - Authenticated: Valid JWT token required
 * - Admin: Valid JWT token + admin role
 */
export const ENDPOINTS = {
    /** AI endpoints — chat, agents, cancellation */
    ai: {
        /**
         * POST — Unified chat completion (Guest OK)
         * New conversation:  POST /api/ai/conversations/{conversationId}/chat
         * Always generate a UUID client-side and use the conversation-scoped URL for all turns.
         */
        chat: (conversationId: string) => `/api/ai/conversations/${conversationId}/chat` as const,
        /**
         * POST — Execute agent with streaming (Guest OK)
         * New conversation:  POST /api/ai/agents/{conversationId}/execute
         * Always generate a UUID client-side and use the conversation-scoped URL for all turns.
         */
        agentExecute: (conversationId: string) => `/api/ai/agents/${conversationId}/execute` as const,
        /**
         * POST — Pre-warm agent cache. No request body. No auth required.
         * POST /api/ai/agents/{agentId}/warm
         */
        agentWarm: (agentId: string) => `/api/ai/agents/${agentId}/warm` as const,
        /** POST — Cancel a running request by request_id (Authenticated) */
        cancel: (requestId: string) => `/api/ai/cancel/${requestId}` as const,
    },

    /** Tool testing endpoints — Authenticated */
    tools: {
        /** GET — List available tools (?category=) */
        testList: '/api/tools/test/list',
        /** GET — Get tool details by name */
        testDetail: (toolName: string) => `/api/tools/test/${toolName}` as const,
        /** POST — Create/reuse test session */
        testSession: '/api/tools/test/session',
        /** POST — Execute tool test with streaming */
        testExecute: '/api/tools/test/execute',
    },

    /** Scraper endpoints — Authenticated */
    scraper: {
        /** POST — Quick scrape URLs */
        quickScrape: '/api/scraper/quick-scrape',
        /** POST — Search keywords */
        search: '/api/scraper/search',
        /** POST — Search and scrape combined */
        searchAndScrape: '/api/scraper/search-and-scrape',
        /** POST — Search and scrape with limits */
        searchAndScrapeLimited: '/api/scraper/search-and-scrape-limited',
        /** POST — Connectivity check */
        micCheck: '/api/scraper/mic-check',
    },

    /** Utility endpoints — Guest OK */
    utilities: {
        /** POST — Extract text from PDF/image (multipart upload) */
        pdfExtractText: '/api/utilities/pdf/extract-text',
    },

    /** Test/admin endpoints — Admin only */
    tests: {
        /** GET/POST — Example endpoints */
        examples: '/api/tests/examples',
        /** GET — Stream text test */
        streamText: '/api/tests/stream/text',
    },

    /** Health endpoints — Public */
    health: {
        /** GET — Basic health check */
        check: '/api/health',
        /** GET — Detailed health with component status */
        detailed: '/api/health/detailed',
    },

    /** Research endpoints — Authenticated */
    research: {
        /** POST — Initialize research config */
        init: '/api/research/init',
        /** GET — List templates */
        templatesList: '/api/research/templates/list',
        /** POST — Create template */
        templatesCreate: '/api/research/templates',
        /** GET — Template detail */
        templateDetail: (templateId: string) => `/api/research/templates/${templateId}` as const,
        /** GET — Extension scrape queue */
        extensionScrapeQueue: '/api/research/extension/scrape-queue',
        /** GET — Research state / PATCH — Update config */
        state: (projectId: string) => `/api/research/${projectId}` as const,
        /** POST — Suggest setup */
        suggest: (projectId: string) => `/api/research/${projectId}/suggest` as const,
        /** POST — Run full pipeline (streaming) */
        run: (projectId: string) => `/api/research/${projectId}/run` as const,
        /** POST — Trigger search (streaming) */
        search: (projectId: string) => `/api/research/${projectId}/search` as const,
        /** POST — Trigger scrape (streaming) */
        scrape: (projectId: string) => `/api/research/${projectId}/scrape` as const,
        /** POST — Analyze all sources (streaming) */
        analyzeAll: (projectId: string) => `/api/research/${projectId}/analyze-all` as const,
        /** POST — Synthesize */
        synthesize: (projectId: string) => `/api/research/${projectId}/synthesize` as const,
        /** GET — Keywords */
        keywords: (projectId: string) => `/api/research/${projectId}/keywords` as const,
        /** GET — Sources */
        sources: (projectId: string) => `/api/research/${projectId}/sources` as const,
        /** GET — Tags */
        tags: (projectId: string) => `/api/research/${projectId}/tags` as const,
        /** GET/POST — Document */
        document: (projectId: string) => `/api/research/${projectId}/document` as const,
        /** GET — Costs */
        costs: (projectId: string) => `/api/research/${projectId}/costs` as const,
    },
} as const;

/**
 * Default backend URLs.
 * Production URL from environment variable, with hardcoded fallback.
 */
export const BACKEND_URLS = {
    production: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com',
    localhost: process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || 'http://localhost:8000',
} as const;
