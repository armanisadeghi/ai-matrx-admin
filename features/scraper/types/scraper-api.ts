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
  search_type?: 'web' | 'news' | 'all';
}

export interface SearchAndScrapeRequest extends ScrapeOptions {
  keywords: string[];
  country_code?: string;
  total_results_per_keyword?: number;
  search_type?: 'web' | 'news' | 'all';
}

export interface SearchAndScrapeLimitedRequest extends ScrapeOptions {
  keyword: string;
  country_code?: string;
  max_page_read?: number;
  search_type?: 'web' | 'news' | 'all';
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
  event: 'status_update';
  data: {
    status: 'connected' | 'processing' | 'warning';
    system_message?: string;
    user_message?: string;
    /** @deprecated Use user_message. Kept for backward compatibility. */
    user_visible_message?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface ScraperDataEvent {
  event: 'data';
  data: ScrapedResult | SearchResult | Record<string, unknown>;
}

export interface ScraperErrorEvent {
  event: 'error';
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
  event: 'end';
  data: true;
}

// ============================================================================
// SCRAPED DATA TYPES
// ============================================================================

export interface ScrapedResult {
  url?: string;
  text_data?: string;
  organized_data?: Record<string, unknown>;
  structured_data?: Record<string, unknown>;
  overview?: {
    page_title?: string;
    url?: string;
    website?: string;
    char_count?: number;
    has_structured_content?: boolean;
    outline?: Record<string, string[]>;
    [key: string]: unknown;
  };
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
  main_image?: string;
  content_filter_removal_details?: unknown[];
  hashes?: string[];
  scraped_at?: string;
}

export interface SearchResult {
  keyword?: string;
  results?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    rank?: number;
  }>;
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
