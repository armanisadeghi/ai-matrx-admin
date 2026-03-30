/**
 * Scraper API Types
 *
 * Endpoints:
 * - POST /api/scraper/quick-scrape - Scrape multiple URLs
 * - POST /api/scraper/search - Search keywords (no scraping)
 * - POST /api/scraper/search-and-scrape - Search and scrape results
 * - POST /api/scraper/search-and-scrape-limited - Search and scrape (limited)
 * - POST /api/scraper/mic-check - Test endpoint
 *
 * Authentication:
 * All scraper requests require ONE of:
 * - Authorization header (Bearer token) - for authenticated users
 * - X-Fingerprint-ID header - for guest users (FingerprintJS visitor ID)
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface ScrapeOptions {
  get_organized_data?: boolean;
  get_structured_data?: boolean;
  get_overview?: boolean;
  get_text_data?: boolean;
  get_main_image?: boolean;
  get_links?: boolean;
  get_content_filter_removal_details?: boolean;
  include_highlighting_markers?: boolean;
  include_media?: boolean;
  include_media_links?: boolean;
  include_media_description?: boolean;
  include_anchors?: boolean;
  anchor_size?: number;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface QuickScrapeRequest extends ScrapeOptions {
  urls: string[];
  use_cache?: boolean;
  stream?: boolean;
}

export interface SearchKeywordsRequest {
  keywords: string[];
  country_code?: string;
  total_results_per_keyword?: number;
  search_type?: "web" | "news" | "all";
}

export interface SearchAndScrapeRequest extends ScrapeOptions {
  keywords: string[];
  country_code?: string;
  total_results_per_keyword?: number;
  search_type?: "web" | "news" | "all";
}

export interface SearchAndScrapeLimitedRequest extends ScrapeOptions {
  keyword: string;
  country_code?: string;
  max_page_read?: number;
  search_type?: "web" | "news" | "all";
}

// ============================================================================
// RESPONSE TYPES (Streaming Events)
// ============================================================================

export type ScraperStreamEvent =
  | ScraperStatusUpdateEvent
  | ScraperDataEvent
  | ScraperErrorEvent
  | ScraperEndEvent;

export interface ScraperStatusUpdateEvent {
  event: "status_update";
  data: {
    status: "connected" | "processing" | "warning";
    system_message?: string;
    user_message?: string;
    /** @deprecated Use user_message. Kept for backward compatibility. */
    user_visible_message?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ScrapedResultsEnvelope {
  response_type: "fetch_results";
  metadata: { execution_time_ms: number };
  results: ScrapedResult[];
}

export interface ScraperDataEvent {
  event: "data";
  data:
    | ScrapedResultsEnvelope
    | ScrapedResult
    | SearchResult
    | Record<string, unknown>;
}

export interface ScraperErrorEvent {
  event: "error";
  data: {
    type: string;
    message: string;
    user_message?: string;
    /** @deprecated Use user_message. Kept for backward compatibility. */
    user_visible_message?: string;
    code?: string;
    details?: unknown;
  };
}

export interface ScraperEndEvent {
  event: "end";
  data: true;
}

// ============================================================================
// SCRAPED DATA TYPES
// ============================================================================

export interface ScrapedResultHashes {
  /** Array of uint32 values (MinHash signature) */
  minhash?: number[] | string;
  /** SimHash fingerprint as integer */
  simhash?: number | string;
  outline_simhash?: number | string;
}

export interface ScrapedResult {
  /** true = scraped successfully, false = scrape failed */
  success?: boolean;
  /** Human-readable reason when success is false */
  failure_reason?: string | null;
  url?: string;
  /** Resolved URL after redirects */
  response_url?: string;
  /** HTTP status code */
  status_code?: number;
  /** CMS detected (e.g. "wordpress", "unknown") */
  cms?: string;
  /** Firewall detected (e.g. "cloudflare", "none") */
  firewall?: string;

  // ── Text variants (richest first) ──
  /** Markdown with links and images */
  markdown_renderable?: string;
  /** Markdown grouped by header */
  markdown_renderable_by_header?: Record<string, string>;
  /** Clean text with inline links — best for AI/research */
  ai_research_content?: string;
  /** Clean plain text — best for AI processing */
  ai_content?: string;
  /** Legacy plain text field */
  text_data?: string;

  organized_data?:
    | Array<{ type: string; level?: number; content: string }>
    | Record<string, unknown>;
  structured_data?: Record<string, unknown>;
  document_outline?: Array<{ type: string; level: number; content: string }>;
  tables?: unknown[];
  code_blocks?: unknown[];
  lists?: unknown[];

  overview?: {
    page_title?: string;
    url?: string;
    website?: string;
    char_count?: number;
    char_count_formatted?: number;
    has_structured_content?: boolean;
    outline?: Record<string, string[]>;
    table_count?: number;
    code_block_count?: number;
    list_count?: number;
    unique_page_name?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
  /** Top-level page title (mirrors overview.page_title) */
  title?: string;

  links?: {
    internal?: string[];
    external?: string[];
    images?: string[];
    documents?: string[];
    others?: string[];
    audio?: string[];
    videos?: string[];
    archives?: string[];
  };
  images?: string[];
  videos?: string[];
  audios?: string[];
  main_image?: string;
  content_filter_removal_details?: unknown[];
  failure_details?: unknown[];
  hashes?: ScrapedResultHashes | null;
  scraped_at?: string;
  /** Per-result metadata (json-ld, opengraph, meta_tags, etc.) */
  metadata?: Record<string, unknown>;
}

/** A single search result item as returned directly by the API */
export interface SearchResultItem {
  keyword?: string;
  type?: string;
  title?: string;
  url?: string;
  /** Result description / snippet */
  description?: string;
  /** Alias for description — some consumers use this */
  snippet?: string;
  source?: string;
  age?: string;
  thumbnail?: string | null;
  rank?: number;
}

/** Legacy grouped format — kept for backward compat */
export interface SearchResult {
  keyword?: string;
  /** Flat items when the API returns them un-grouped */
  results?: SearchResultItem[];
  total_results?: number;
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * AUTHENTICATED USER FLOW
 *
 * ```typescript
 * import { BACKEND_URLS } from '@/lib/api/endpoints';
 *
 * const response = await fetch(`${BACKEND_URLS.production}/api/scraper/quick-scrape`, {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "Authorization": `Bearer ${supabaseSession.access_token}`,
 *   },
 *   body: JSON.stringify({
 *     urls: ["https://example.com"],
 *     get_text_data: true,
 *     get_overview: true,
 *   }),
 * });
 * ```
 *
 * GUEST USER FLOW (using centralized fingerprint service)
 *
 * ```typescript
 * import { getFingerprint } from '@/lib/services/fingerprint-service';
 * import { BACKEND_URLS } from '@/lib/api/endpoints';
 *
 * const fingerprintId = await getFingerprint();
 *
 * const response = await fetch(`${BACKEND_URLS.production}/api/scraper/quick-scrape`, {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     "X-Fingerprint-ID": fingerprintId,
 *   },
 *   body: JSON.stringify({
 *     urls: ["https://example.com"],
 *   }),
 * });
 * ```
 */
