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
     * POST — Manual-mode execution (Builder + ephemeral conversations).
     * POST /ai/manual
     *
     * Accepts full message history in `messages` on every call. Used by:
     *   • Builder — reads the LIVE agent definition (incl. unsaved edits) and
     *     sends it as the system instruction + priming messages.
     *   • Ephemeral conversations (turn 2+) — no DB row exists, so the client
     *     is the source of truth for history; sends it with each turn.
     *
     * `conversation_id` is optional in the body (for labeling/storage only);
     * pair with `is_new:false, store:false` for fully stateless runs.
     *
     * NOTE: this replaces the legacy `/ai/chat` endpoint. The canonical
     * client-side vocabulary is `manual` (see ConversationInvocation.routing
     * .conversationMode). The legacy `chat` alias below stays for one
     * migration cycle.
     */
    manual: "/ai/manual" as const,

    /** @deprecated Use `ENDPOINTS.ai.manual`. Kept for one migration cycle. */
    chat: "/ai/manual" as const,

    /**
     * POST — Start a new agent conversation (Guest OK)
     * POST /ai/agents/{agentId}
     * Never send conversation_id — the server generates it and returns it in the stream.
     */
    agentStart: (agentId: string) => `/ai/agents/${agentId}` as const,

    /**
     * POST — Continue any existing conversation (Guest OK)
     * POST /ai/conversations/{conversationId}
     * Conversation ID in URL. Just send user_input in the body.
     */
    conversationContinue: (conversationId: string) =>
      `/ai/conversations/${conversationId}` as const,

    /**
     * POST — Pre-warm a conversation's server cache. No body. No auth.
     * POST /ai/conversations/{conversationId}/warm
     * Fire when user navigates to a conversation page.
     */
    conversationWarm: (conversationId: string) =>
      `/ai/conversations/${conversationId}/warm` as const,

    /**
     * POST — Pre-warm an agent's server cache. No auth. (public endpoint)
     * POST /ai/agents/{agentId}/warm
     * Optional body: `{ source: "prompt" | "builtin" | "prompt_version" | "builtin_version" }`
     */
    agentWarm: (agentId: string) => `/ai/agents/${agentId}/warm` as const,

    /**
     * POST — Start a new prompt conversation (Guest OK)
     * POST /ai/prompts/{promptId}
     * Body: PromptStartRequest — user_input, variables, stream, debug, client_tools, etc.
     * Never send conversation_id — the server generates it and returns it in the stream.
     */
    promptStart: (promptId: string) => `/ai/prompts/${promptId}` as const,

    /**
     * POST — Pre-warm a prompt's server cache. No auth. (public endpoint)
     * POST /ai/prompts/{promptId}/warm
     * Optional body: `{ source: string | null }`
     */
    promptWarm: (promptId: string) => `/ai/prompts/${promptId}/warm` as const,

    /**
     * POST — Start a new block-streaming agent session (Guest OK)
     * POST /ai/agents-blocks/{agentId}
     * Same as agentStart but emits 'content_block' NDJSON events instead of raw 'chunk' events.
     */
    agentBlocksStart: (agentId: string) =>
      `/ai/agents-blocks/${agentId}` as const,

    /**
     * POST — Pre-warm a block-streaming agent (Public)
     * POST /ai/agents-blocks/{agentId}/warm
     * Optional body: `{ source: "prompt" | "builtin" | "prompt_version" | "builtin_version" }`
     */
    agentBlocksWarm: (agentId: string) =>
      `/ai/agents-blocks/${agentId}/warm` as const,

    /**
     * POST — Execute a prompt app using its pinned prompt version (Guest OK)
     * POST /ai/apps/{appId}
     * The backend resolves the pinned prompt version — the client never sees prompt secrets.
     */
    appExecute: (appId: string) => `/ai/apps/${appId}` as const,

    /**
     * POST — Pre-warm a prompt app's pinned version into cache (Public, no auth)
     * POST /ai/apps/{appId}/warm
     * Fire when the prompt app page loads so execution is instant.
     */
    appWarm: (appId: string) => `/ai/apps/${appId}/warm` as const,

    /** POST — Cancel a running request by request_id (Authenticated) */
    cancel: (requestId: string) => `/ai/cancel/${requestId}` as const,
  },

  /** Block processing test endpoints — Guest OK */
  blockProcessing: {
    /** POST — Process raw text/markdown → structured blocks (JSON response) */
    process: "/utilities/block-processing/process" as const,
    /** POST — Process raw text/markdown → block events (NDJSON stream, simulates live agent) */
    processStream: "/utilities/block-processing/process/stream" as const,
  },

  /** Tool testing endpoints — Authenticated */
  tools: {
    /** GET — List available tools (?category=) */
    testList: "/tools/test/list",
    /** GET — Get tool details by name */
    testDetail: (toolName: string) => `/tools/test/${toolName}` as const,
    /** POST — Create/reuse test session */
    testSession: "/tools/test/session",
    /** POST — Execute tool test with streaming */
    testExecute: "/tools/test/execute",
  },

  /** Scraper endpoints — Authenticated */
  scraper: {
    /** POST — Quick scrape URLs */
    quickScrape: "/scraper/quick-scrape",
    /** POST — Search keywords */
    search: "/scraper/search",
    /** POST — Search and scrape combined */
    searchAndScrape: "/scraper/search-and-scrape",
    /** POST — Search and scrape with limits */
    searchAndScrapeLimited: "/scraper/search-and-scrape-limited",
    /** POST — Connectivity check */
    micCheck: "/scraper/mic-check",
  },

  /** Utility endpoints — Guest OK */
  utilities: {
    /** @deprecated Use ENDPOINTS.pdf.extractText instead */
    pdfExtractText: "/utilities/pdf/extract-text",
  },

  /** PDF extraction & document management — Authenticated */
  pdf: {
    /** POST — Compress PDF (multipart file upload) */
    compress: "/utilities/pdf/compress" as const,
    /** POST — Single-file text extraction (stateless, legacy) */
    extractText: "/utilities/pdf/extract-text" as const,
    /** POST — Batch extraction with NDJSON streaming (saves to DB + storage) */
    batchExtract: "/utilities/pdf/batch-extract" as const,
    /** GET — List user documents (?limit=&offset=) */
    documents: "/utilities/pdf/documents" as const,
    /** GET — Single document by ID */
    document: (docId: string) => `/utilities/pdf/documents/${docId}` as const,
    /** POST — AI content cleaning (NDJSON streaming) */
    cleanContent: (docId: string) =>
      `/utilities/pdf/clean-content/${docId}` as const,
  },

  /** Test/admin endpoints — Admin only */
  tests: {
    /** GET/POST — Example endpoints */
    examples: "/tests/examples",
    /** GET — Stream text test */
    streamText: "/tests/stream/text",
  },

  /** Builtin agent endpoints — Authenticated */
  builtinAgents: {
    /** POST — Categorize a single prompt (streaming) */
    categorize: "/ai/builtin-agents/categorize" as const,
    /** POST — Categorize a single prompt (sync, no streaming) */
    categorizeSync: "/ai/builtin-agents/categorize/sync" as const,
  },

  /** Media processing endpoints — Authenticated */
  media: {
    /** POST — Upload podcast image → resize to 3 variants, returns URLs */
    uploadPodcastImage: "/media/podcast/upload-image" as const,
    /** POST — Upload podcast video → extract frame, resize to 3 variants, returns URLs */
    uploadPodcastVideo: "/media/podcast/upload-video" as const,
  },

  /** Health endpoints — Public (aligned with types/python-generated OpenAPI) */
  health: {
    /** GET — Basic health check */
    check: "/health",
    /** GET — Detailed health with component status */
    detailed: "/health/detailed",
    /** GET — Liveness (process up; no I/O) */
    live: "/health/live",
    /** GET — Readiness (deps initialized; use for deploy probes) */
    ready: "/health/ready",
  },

  /** Research endpoints — Authenticated */
  research: {
    /** POST — Initialize research config */
    init: "/research/init",
    /** GET — List templates */
    templatesList: "/research/templates/list",
    /** POST — Create template */
    templatesCreate: "/research/templates",
    /** GET — Template detail */
    templateDetail: (templateId: string) =>
      `/research/templates/${templateId}` as const,
    /** GET — Extension scrape queue */
    extensionScrapeQueue: "/research/extension/scrape-queue",
    /** GET — Research state / PATCH — Update config */
    state: (projectId: string) => `/research/${projectId}` as const,
    /** POST — Suggest setup */
    suggest: (projectId: string) => `/research/${projectId}/suggest` as const,
    /** POST — Run full pipeline (streaming) */
    run: (projectId: string) => `/research/${projectId}/run` as const,
    /** POST — Trigger search (streaming) */
    search: (projectId: string) => `/research/${projectId}/search` as const,
    /** POST — Trigger scrape (streaming) */
    scrape: (projectId: string) => `/research/${projectId}/scrape` as const,
    /** POST — Analyze all sources (streaming) */
    analyzeAll: (projectId: string) =>
      `/research/${projectId}/analyze-all` as const,
    /** POST — Synthesize */
    synthesize: (projectId: string) =>
      `/research/${projectId}/synthesize` as const,
    /** GET — Keywords */
    keywords: (projectId: string) => `/research/${projectId}/keywords` as const,
    /** GET — Sources */
    sources: (projectId: string) => `/research/${projectId}/sources` as const,
    /** GET — Tags */
    tags: (projectId: string) => `/research/${projectId}/tags` as const,
    /** GET/POST — Document */
    document: (projectId: string) => `/research/${projectId}/document` as const,
    /** GET — Costs */
    costs: (projectId: string) => `/research/${projectId}/costs` as const,
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
 * Use the service origin only (e.g. https://server.example.com), not a path
 * suffix like https://server.example.com/api — paths in ENDPOINTS are rooted at
 * the host (/health, /ai, …). A bad base produces wrong URLs and server warnings.
 *
 * 'custom' is not listed here — it is stored in adminPreferences.customServerUrl
 * and resolved dynamically in resolveBaseUrl().
 */
export const BACKEND_URLS: Record<string, string | undefined> = {
  production: process.env.NEXT_PUBLIC_BACKEND_URL_PROD,
  development: process.env.NEXT_PUBLIC_BACKEND_URL_DEV,
  staging: process.env.NEXT_PUBLIC_BACKEND_URL_STAGING,
  localhost:
    process.env.NEXT_PUBLIC_BACKEND_URL_LOCAL ?? "http://localhost:8000",
  gpu: process.env.NEXT_PUBLIC_BACKEND_URL_GPU,
} as const;
