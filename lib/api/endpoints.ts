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
    /** AI endpoints — chat, agents */
    ai: {
        /** POST — Unified chat completion (Guest OK) */
        chatUnified: '/api/ai/chat/unified',
        /** POST — Pre-warm agent cache (Public, no auth) */
        agentWarm: '/api/ai/agent/warm',
        /** POST — Execute agent with streaming (Guest OK) */
        agentExecute: '/api/ai/agent/execute',
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
} as const;

/**
 * Default backend URLs.
 * Production URL from environment variable, with hardcoded fallback.
 */
export const BACKEND_URLS = {
    production: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com',
    localhost: process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || 'http://localhost:8000',
} as const;
