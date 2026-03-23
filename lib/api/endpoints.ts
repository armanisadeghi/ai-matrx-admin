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
    /** AI endpoints — chat, agents, conversations */
    ai: {
        /**
         * POST — Custom one-shot or managed chat (Guest OK)
         * POST /api/ai/chat
         * conversation_id is optional in the body (for labeling/storage only).
         * You must send the full message history in `messages` every time.
         */
        chat: '/api/ai/chat' as const,

        /**
         * POST — Start a new agent conversation (Guest OK)
         * POST /api/ai/agents/{agentId}
         * Never send conversation_id — the server generates it and returns it in the stream.
         */
        agentStart: (agentId: string) => `/api/ai/agents/${agentId}` as const,

        /**
         * POST — Continue any existing conversation (Guest OK)
         * POST /api/ai/conversations/{conversationId}
         * Conversation ID in URL. Just send user_input in the body.
         */
        conversationContinue: (conversationId: string) => `/api/ai/conversations/${conversationId}` as const,

        /**
         * POST — Pre-warm a conversation's server cache. No body. No auth.
         * POST /api/ai/conversations/{conversationId}/warm
         * Fire when user navigates to a conversation page.
         */
        conversationWarm: (conversationId: string) => `/api/ai/conversations/${conversationId}/warm` as const,

        /**
         * POST — Pre-warm an agent's server cache. No auth. (public endpoint)
         * POST /api/ai/agents/{agentId}/warm
         * Optional body: `{ source: "prompt" | "builtin" | "prompt_version" | "builtin_version" }`
         */
        agentWarm: (agentId: string) => `/api/ai/agents/${agentId}/warm` as const,

        /**
         * POST — Start a new block-streaming agent session (Guest OK)
         * POST /api/ai/agents-blocks/{agentId}
         * Same as agentStart but emits 'content_block' NDJSON events instead of raw 'chunk' events.
         */
        agentBlocksStart: (agentId: string) => `/api/ai/agents-blocks/${agentId}` as const,

        /**
         * POST — Pre-warm a block-streaming agent (Public)
         * POST /api/ai/agents-blocks/{agentId}/warm
         * Optional body: `{ source: "prompt" | "builtin" | "prompt_version" | "builtin_version" }`
         */
        agentBlocksWarm: (agentId: string) => `/api/ai/agents-blocks/${agentId}/warm` as const,

        /**
         * POST — Execute a prompt app using its pinned prompt version (Guest OK)
         * POST /api/ai/apps/{appId}
         * The backend resolves the pinned prompt version — the client never sees prompt secrets.
         */
        appExecute: (appId: string) => `/api/ai/apps/${appId}` as const,

        /**
         * POST — Pre-warm a prompt app's pinned version into cache (Public, no auth)
         * POST /api/ai/apps/{appId}/warm
         * Fire when the prompt app page loads so execution is instant.
         */
        appWarm: (appId: string) => `/api/ai/apps/${appId}/warm` as const,

        /** POST — Cancel a running request by request_id (Authenticated) */
        cancel: (requestId: string) => `/api/ai/cancel/${requestId}` as const,
    },

    /** Block processing test endpoints — Guest OK */
    blockProcessing: {
        /** POST — Process raw text/markdown → structured blocks (JSON response) */
        process: '/api/utilities/block-processing/process' as const,
        /** POST — Process raw text/markdown → block events (NDJSON stream, simulates live agent) */
        processStream: '/api/utilities/block-processing/process/stream' as const,
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

    /** Builtin agent endpoints — Authenticated */
    builtinAgents: {
        /** POST — Categorize a single prompt (streaming) */
        categorize: '/api/ai/builtin-agents/categorize' as const,
        /** POST — Categorize a single prompt (sync, no streaming) */
        categorizeSync: '/api/ai/builtin-agents/categorize/sync' as const,
    },

    /** Media processing endpoints — Authenticated */
    media: {
        /** POST — Upload podcast image → resize to 3 variants, returns URLs */
        uploadPodcastImage: '/api/media/podcast/upload-image' as const,
        /** POST — Upload podcast video → extract frame, resize to 3 variants, returns URLs */
        uploadPodcastVideo: '/api/media/podcast/upload-video' as const,
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
 * Backend base URLs — one entry per ServerEnvironment in adminPreferencesSlice.
 *
 * ALL values MUST come from environment variables. No fallback URLs are
 * hardcoded here — if a variable is missing the value is undefined, which
 * will surface as a clear error rather than silently pointing at the wrong
 * server. Configure every env in .env.local / Vercel project settings.
 *
 * Environment variables:
 *   NEXT_PUBLIC_BACKEND_URL_PROD     → production server
 *   NEXT_PUBLIC_BACKEND_URL_DEV      → development/feature-branch server
 *   NEXT_PUBLIC_BACKEND_URL_STAGING  → staging server
 *   NEXT_PUBLIC_BACKEND_URL_LOCAL    → local dev (default: http://localhost:8000)
 *   NEXT_PUBLIC_BACKEND_URL_GPU      → dedicated GPU inference server
 *
 * 'custom' is not listed here — it is stored in adminPreferences.customServerUrl
 * and resolved dynamically in resolveBaseUrl().
 */
export const BACKEND_URLS: Record<string, string | undefined> = {
    production: process.env.NEXT_PUBLIC_BACKEND_URL_PROD,
    development: process.env.NEXT_PUBLIC_BACKEND_URL_DEV,
    staging: process.env.NEXT_PUBLIC_BACKEND_URL_STAGING,
    localhost: process.env.NEXT_PUBLIC_BACKEND_URL_LOCAL ?? 'http://localhost:8000',
    gpu: process.env.NEXT_PUBLIC_BACKEND_URL_GPU,
} as const;
