"use client";

/**
 * useScraperApi — Unified HTTP hook for all scraper endpoints.
 *
 * Uses the central useBackendApi hook (reads active server from Redux apiConfigSlice)
 * so it respects whatever backend is selected (localhost, dev, prod, etc.).
 *
 * All endpoints stream NDJSON. This hook buffers the full stream and resolves
 * when the `end` event arrives.
 *
 * Endpoints:
 *   POST /api/scraper/quick-scrape          — scrape one or more URLs
 *   POST /api/scraper/search                — search keywords (no scraping)
 *   POST /api/scraper/search-and-scrape     — search + scrape results
 *   POST /api/scraper/search-and-scrape-limited — single keyword, limited pages
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useBackendApi } from "@/hooks/useBackendApi";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import type {
  QuickScrapeRequest,
  SearchKeywordsRequest,
  SearchAndScrapeRequest,
  SearchAndScrapeLimitedRequest,
  ScrapedResult,
  SearchResult,
  SearchResultItem,
} from "@/features/scraper/types/scraper-api";

// ============================================================================
// Types
// ============================================================================

export interface ScraperOverview {
  page_title?: string;
  url?: string;
  website?: string;
  char_count?: number;
  has_structured_content?: boolean;
  outline?: Record<string, string[]>;
  [key: string]: unknown;
}

export interface ScraperLinks {
  internal?: string[];
  external?: string[];
  images?: string[];
  documents?: string[];
  others?: string[];
  audio?: string[];
  videos?: string[];
  archives?: string[];
}

export interface ScraperResult {
  url: string;
  /** Best available text — markdown_renderable > ai_research_content > ai_content > text_data */
  textContent: string;
  overview: ScraperOverview;
  /** Structured/schema data (structured_data or fallback metadata) */
  structuredData: object;
  /** Organized content sections — { sections: [...] } if the API returns an array */
  organizedData: object;
  links: ScraperLinks;
  images: string[];
  mainImage: string | null;
  metadata: { execution_time_ms?: number; [key: string]: unknown };
  scrapedAt: string;
}

export interface ScraperApiState {
  data: ScraperResult | null;
  /** Raw API result object — unmodified, for inspection/debugging */
  rawData: Record<string, unknown> | null;
  /** Legacy grouped search results */
  searchResults: SearchResult[];
  /** Flat search result items exactly as returned by the API */
  searchItems: SearchResultItem[];
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  statusMessage: string | null;
}

export interface UseScraperApiReturn extends ScraperApiState {
  scrapeUrl: (
    url: string,
    options?: Partial<QuickScrapeRequest>,
  ) => Promise<ScraperResult | null>;
  /** Same as scrapeUrl but never touches global isLoading/error — for background per-item scrapes */
  scrapeUrlSilent: (
    url: string,
    options?: Partial<QuickScrapeRequest>,
  ) => Promise<ScraperResult | null>;
  scrapeUrlRaw: (
    url: string,
    options?: Partial<QuickScrapeRequest>,
  ) => Promise<Record<string, unknown> | null>;
  scrapeUrls: (
    urls: string[],
    options?: Partial<QuickScrapeRequest>,
  ) => Promise<ScraperResult[] | null>;
  search: (request: SearchKeywordsRequest) => Promise<SearchResult[] | null>;
  searchAndScrape: (
    request: SearchAndScrapeRequest,
  ) => Promise<ScraperResult[] | null>;
  searchAndScrapeLimited: (
    request: SearchAndScrapeLimitedRequest,
  ) => Promise<ScraperResult[] | null>;
  /** Abort any in-flight request immediately */
  cancel: () => void;
  reset: () => void;
}

// ============================================================================
// Raw result envelope shape from the API
// ============================================================================

interface ResultEnvelope {
  response_type?: string;
  metadata?: Record<string, unknown>;
  results?: Array<Record<string, unknown>>;
}

// ============================================================================
// Stream consumer — shared by all endpoints
// ============================================================================

async function consumeScrapeStream(
  response: Response,
  onStatus: (msg: string) => void,
): Promise<{
  results: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
}> {
  const { events } = parseNdjsonStream(response);

  let results: Array<Record<string, unknown>> = [];
  let metadata: Record<string, unknown> = {};

  for await (const event of events) {
    const e = event as unknown as Record<string, unknown>;
    const eventType = e.event as string | undefined;
    const eventData = e.data as Record<string, unknown> | undefined;

    if (process.env.NODE_ENV === "development") {
      console.debug("[scraper stream] raw event:", {
        eventType,
        eventDataKeys: eventData
          ? Object.keys(eventData).join(", ")
          : "(no data)",
        responseType: eventData?.response_type,
        hasResults: Array.isArray(eventData?.results),
        resultsCount: Array.isArray(eventData?.results)
          ? (eventData!.results as unknown[]).length
          : 0,
      });
    }

    if (eventType === "status_update") {
      const msg = (eventData?.user_message ??
        eventData?.user_visible_message ??
        eventData?.system_message) as string | undefined;
      if (msg) onStatus(msg);
    } else if (eventType === "data") {
      if (!eventData) continue;
      const responseType = eventData.response_type as string | undefined;

      if (
        Array.isArray(eventData.results) &&
        (eventData.results as unknown[]).length > 0
      ) {
        // Any envelope with a results array — covers all response_type values
        results = [
          ...results,
          ...(eventData.results as Array<Record<string, unknown>>),
        ];
        if (eventData.metadata)
          metadata = eventData.metadata as Record<string, unknown>;
      } else if (
        "text_data" in eventData ||
        "overview" in eventData ||
        "url" in eventData
      ) {
        // Single-result (no envelope) — direct result object
        results.push(eventData);
      } else if ("keyword" in eventData) {
        // Search result item
        results.push(eventData);
      } else if (process.env.NODE_ENV === "development") {
        console.debug(
          "[scraper stream] data event with unrecognized shape — response_type:",
          responseType,
          "keys:",
          Object.keys(eventData).join(", "),
        );
      }
    } else if (eventType === "error") {
      const errData = eventData ?? (e as Record<string, unknown>);
      const msg = (errData.user_message ?? errData.message) as
        | string
        | undefined;
      throw new Error(msg ?? "Scraping failed");
    } else if (!eventType) {
      // Raw line with no event wrapper — the line itself is the payload.
      // Some backend versions send the envelope directly as a top-level object.
      const responseType = e.response_type as string | undefined;
      if (Array.isArray(e.results) && (e.results as unknown[]).length > 0) {
        // Any envelope with a results array — covers fetch_results, scraped_pages,
        // search_and_scrape_results, search_scrape_results, and any future types
        results = [
          ...results,
          ...(e.results as Array<Record<string, unknown>>),
        ];
        if (e.metadata) metadata = e.metadata as Record<string, unknown>;
      } else if ("text_data" in e || "overview" in e || "keyword" in e) {
        results.push(e);
      } else if (process.env.NODE_ENV === "development") {
        console.debug(
          "[scraper stream] unhandled raw (no event) line — response_type:",
          responseType,
          "keys:",
          Object.keys(e).join(", "),
        );
      }
    } else if (
      process.env.NODE_ENV === "development" &&
      eventType !== "end" &&
      eventType !== "status_update"
    ) {
      console.debug("[scraper stream] unhandled event type:", eventType);
    }
    // "end" event — loop will naturally finish
  }

  if (process.env.NODE_ENV === "development") {
    console.debug(
      "[scraper stream] finished — results count:",
      results.length,
      "metadata:",
      metadata,
    );
  }

  return { results, metadata };
}

// ============================================================================
// Map raw API result → typed ScraperResult
// ============================================================================

function mapToScraperResult(
  raw: Record<string, unknown>,
  fallbackUrl: string,
  envelopeMetadata: Record<string, unknown>,
): ScraperResult {
  // The API now sends several text variants — pick the richest available one.
  // Priority: markdown_renderable > ai_research_content > ai_content > text_data > legacy fields
  const textContent =
    (raw.markdown_renderable as string) ||
    (raw.ai_research_content as string) ||
    (raw.ai_content as string) ||
    (raw.text_data as string) ||
    (raw.content as string) ||
    (raw.text as string) ||
    (raw.page_content as string) ||
    "";

  const rawOverview = (raw.overview as ScraperOverview) || {};

  // page_title: prefer overview field, then top-level title
  const page_title =
    rawOverview.page_title ??
    (raw.page_title as string) ??
    (raw.title as string) ??
    undefined;

  // char_count: prefer overview field, then compute from chosen text
  const char_count =
    rawOverview.char_count != null && rawOverview.char_count > 0
      ? rawOverview.char_count
      : textContent.length > 0
        ? textContent.length
        : undefined;

  const overview: ScraperOverview = {
    ...rawOverview,
    page_title,
    char_count,
  };

  // structured_data: prefer dedicated field, fall back to top-level metadata object
  const structuredData =
    (raw.structured_data as object) || (raw.metadata as object) || {};

  // organized_data: API now sends an array; wrap it if needed so consumers get a consistent object
  const rawOrgData = raw.organized_data;
  const organizedData: object = Array.isArray(rawOrgData)
    ? { sections: rawOrgData }
    : (rawOrgData as object) || {};

  // links — same shape, just defensive fallback
  const links = (raw.links as ScraperLinks) || {};

  // images: prefer dedicated images array, then links.images
  const images = (raw.images as string[])?.length
    ? (raw.images as string[])
    : links.images || [];

  // result-level metadata (the per-result one, not the envelope-level one)
  const resultMetadata =
    (raw.metadata as { execution_time_ms?: number }) || envelopeMetadata || {};

  return {
    url: (raw.url as string) || (raw.response_url as string) || fallbackUrl,
    textContent,
    overview,
    structuredData,
    organizedData,
    links,
    images,
    mainImage: (raw.main_image as string) || null,
    metadata: resultMetadata,
    scrapedAt: (raw.scraped_at as string) || new Date().toISOString(),
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useScraperApi(): UseScraperApiReturn {
  const api = useBackendApi();

  const [data, setData] = useState<ScraperResult | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown> | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchItems, setSearchItems] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // AbortController for in-flight requests — cancelled on unmount or via cancel()
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setStatusMessage(null);
  }, []);

  /** Create a fresh AbortController, replacing any previous one */
  const newSignal = useCallback((): AbortSignal => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller.signal;
  }, []);

  const onStatus = useCallback((msg: string) => setStatusMessage(msg), []);

  // --------------------------------------------------------------------------
  // scrapeUrl — single URL, returns first ScraperResult
  // --------------------------------------------------------------------------
  const scrapeUrl = useCallback(
    async (
      url: string,
      options: Partial<QuickScrapeRequest> = {},
    ): Promise<ScraperResult | null> => {
      setIsLoading(true);
      setError(null);
      setData(null);
      setStatusMessage(null);

      try {
        const signal = newSignal();
        const body: QuickScrapeRequest = {
          urls: [url],
          use_cache: true,
          get_text_data: true,
          get_overview: true,
          get_links: true,
          get_main_image: true,
          get_organized_data: true,
          get_structured_data: true,
          get_content_filter_removal_details: false,
          include_highlighting_markers: false,
          include_media: true,
          include_media_links: true,
          include_media_description: true,
          include_anchors: true,
          anchor_size: 100,
          ...options,
        };

        const response = await api.post(
          ENDPOINTS.scraper.quickScrape,
          body,
          signal,
        );
        const { results, metadata } = await consumeScrapeStream(
          response,
          onStatus,
        );

        if (!results.length)
          throw new Error("No results returned from scraper");

        const first = results[0];
        // Support both new (success/failure_reason) and old (status/error) field names
        const failed = first.success === false || first.status === "error";
        if (failed)
          throw new Error(
            (first.failure_reason as string) ??
              (first.error as string) ??
              "Scraping failed",
          );

        const scraperResult = mapToScraperResult(first, url, metadata);
        setRawData(first);
        setData(scraperResult);
        return scraperResult;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to scrape URL";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [api, newSignal, onStatus],
  );

  // --------------------------------------------------------------------------
  // scrapeUrlSilent — scrape a single URL without touching global loading state
  // Useful for per-item background scrapes that should not block the whole UI.
  // --------------------------------------------------------------------------
  const scrapeUrlSilent = useCallback(
    async (
      url: string,
      options: Partial<QuickScrapeRequest> = {},
    ): Promise<ScraperResult | null> => {
      try {
        const body: QuickScrapeRequest = {
          urls: [url],
          use_cache: false,
          get_text_data: true,
          get_overview: true,
          get_links: true,
          get_main_image: false,
          get_organized_data: false,
          get_structured_data: false,
          get_content_filter_removal_details: false,
          include_highlighting_markers: false,
          include_media: false,
          include_media_links: false,
          include_media_description: false,
          include_anchors: false,
          anchor_size: 100,
          ...options,
        };

        const response = await api.post(ENDPOINTS.scraper.quickScrape, body);
        const { results, metadata } = await consumeScrapeStream(
          response,
          onStatus,
        );

        if (!results.length) throw new Error("No results returned");

        const first = results[0];
        const failed = first.success === false || first.status === "error";
        if (failed)
          throw new Error(
            (first.failure_reason as string) ??
              (first.error as string) ??
              "Scraping failed",
          );

        return mapToScraperResult(first, url, metadata);
      } catch (err) {
        throw err;
      }
    },
    [api, onStatus],
  );

  // --------------------------------------------------------------------------
  // scrapeUrlRaw — same as scrapeUrl but returns the unmodified API result
  // --------------------------------------------------------------------------
  const scrapeUrlRaw = useCallback(
    async (
      url: string,
      options: Partial<QuickScrapeRequest> = {},
    ): Promise<Record<string, unknown> | null> => {
      setIsLoading(true);
      setError(null);
      setData(null);
      setRawData(null);
      setStatusMessage(null);

      try {
        const signal = newSignal();
        const body: QuickScrapeRequest = {
          urls: [url],
          use_cache: true,
          get_text_data: true,
          get_overview: true,
          get_links: true,
          get_main_image: true,
          get_organized_data: true,
          get_structured_data: true,
          get_content_filter_removal_details: false,
          include_highlighting_markers: false,
          include_media: true,
          include_media_links: true,
          include_media_description: true,
          include_anchors: true,
          anchor_size: 100,
          ...options,
        };

        const response = await api.post(
          ENDPOINTS.scraper.quickScrape,
          body,
          signal,
        );
        const { results, metadata } = await consumeScrapeStream(
          response,
          onStatus,
        );

        if (!results.length)
          throw new Error("No results returned from scraper");

        const first = results[0];
        setRawData(first);
        const scraperResult = mapToScraperResult(first, url, metadata);
        setData(scraperResult);
        return first;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to scrape URL";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [api, newSignal, onStatus],
  );

  // --------------------------------------------------------------------------
  // scrapeUrls — multiple URLs, returns array of ScraperResults
  // --------------------------------------------------------------------------
  const scrapeUrls = useCallback(
    async (
      urls: string[],
      options: Partial<QuickScrapeRequest> = {},
    ): Promise<ScraperResult[] | null> => {
      setIsLoading(true);
      setError(null);
      setData(null);
      setStatusMessage(null);

      try {
        const signal = newSignal();
        const body: QuickScrapeRequest = {
          urls,
          use_cache: true,
          get_text_data: true,
          get_overview: true,
          get_links: true,
          get_main_image: true,
          get_organized_data: true,
          get_structured_data: true,
          get_content_filter_removal_details: false,
          include_highlighting_markers: false,
          include_media: true,
          include_media_links: true,
          include_media_description: true,
          include_anchors: true,
          anchor_size: 100,
          ...options,
        };

        const response = await api.post(
          ENDPOINTS.scraper.quickScrape,
          body,
          signal,
        );
        const { results, metadata } = await consumeScrapeStream(
          response,
          onStatus,
        );

        if (!results.length)
          throw new Error("No results returned from scraper");

        const mapped = results.map((r, i) =>
          mapToScraperResult(r, urls[i] ?? "", metadata),
        );
        if (mapped[0]) setData(mapped[0]);
        return mapped;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to scrape URLs";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [api, newSignal, onStatus],
  );

  // --------------------------------------------------------------------------
  // search — keyword search only, no scraping
  // --------------------------------------------------------------------------
  const search = useCallback(
    async (
      request: SearchKeywordsRequest,
    ): Promise<SearchResultItem[] | null> => {
      setIsLoading(true);
      setError(null);
      setSearchResults([]);
      setSearchItems([]);
      setStatusMessage(null);

      try {
        const signal = newSignal();
        const response = await api.post(
          ENDPOINTS.scraper.search,
          request,
          signal,
        );
        const { results } = await consumeScrapeStream(response, onStatus);

        // API returns flat items — each has keyword, title, url, description, etc.
        // Detect whether we got flat items or grouped { keyword, results: [] } objects.
        const items = results as unknown as SearchResultItem[];
        const isFlat = items.length > 0 && "title" in items[0];

        if (isFlat) {
          setSearchItems(items);
          // Also populate legacy searchResults grouped by keyword for backward compat
          const grouped: Record<string, SearchResultItem[]> = {};
          for (const item of items) {
            const kw = item.keyword ?? "results";
            (grouped[kw] ??= []).push(item);
          }
          const legacy: SearchResult[] = Object.entries(grouped).map(
            ([keyword, res]) => ({
              keyword,
              results: res,
              total_results: res.length,
            }),
          );
          setSearchResults(legacy);
          return items;
        } else {
          // Legacy grouped format
          const sr = results as unknown as SearchResult[];
          setSearchResults(sr);
          const flat = sr.flatMap((r) => r.results ?? []);
          setSearchItems(flat);
          return flat;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Search failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [api, newSignal, onStatus],
  );

  // --------------------------------------------------------------------------
  // searchAndScrape — search keywords then scrape each result
  // --------------------------------------------------------------------------
  const searchAndScrape = useCallback(
    async (
      request: SearchAndScrapeRequest,
    ): Promise<ScraperResult[] | null> => {
      setIsLoading(true);
      setError(null);
      setData(null);
      setStatusMessage(null);

      try {
        const signal = newSignal();
        const response = await api.post(
          ENDPOINTS.scraper.searchAndScrape,
          request,
          signal,
        );
        const { results, metadata } = await consumeScrapeStream(
          response,
          onStatus,
        );

        if (!results.length) throw new Error("No results returned");

        const mapped = results.map((r) =>
          mapToScraperResult(r, (r.url as string) ?? "", metadata),
        );
        if (mapped[0]) setData(mapped[0]);
        return mapped;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Search and scrape failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [api, newSignal, onStatus],
  );

  // --------------------------------------------------------------------------
  // searchAndScrapeLimited — single keyword, max N pages
  // --------------------------------------------------------------------------
  const searchAndScrapeLimited = useCallback(
    async (
      request: SearchAndScrapeLimitedRequest,
    ): Promise<ScraperResult[] | null> => {
      setIsLoading(true);
      setError(null);
      setData(null);
      setStatusMessage(null);

      try {
        const signal = newSignal();
        const response = await api.post(
          ENDPOINTS.scraper.searchAndScrapeLimited,
          request,
          signal,
        );
        const { results, metadata } = await consumeScrapeStream(
          response,
          onStatus,
        );

        if (!results.length) throw new Error("No results returned");

        const mapped = results.map((r) =>
          mapToScraperResult(r, (r.url as string) ?? "", metadata),
        );
        if (mapped[0]) setData(mapped[0]);
        return mapped;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Search and scrape limited failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [api, newSignal, onStatus],
  );

  // --------------------------------------------------------------------------
  // reset
  // --------------------------------------------------------------------------
  const reset = useCallback(() => {
    setData(null);
    setRawData(null);
    setSearchResults([]);
    setSearchItems([]);
    setError(null);
    setStatusMessage(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    rawData,
    searchResults,
    searchItems,
    isLoading,
    hasError: !!error,
    error,
    statusMessage,
    scrapeUrl,
    scrapeUrlSilent,
    scrapeUrlRaw,
    scrapeUrls,
    search,
    searchAndScrape,
    searchAndScrapeLimited,
    cancel,
    reset,
  };
}
