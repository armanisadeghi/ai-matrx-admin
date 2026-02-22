"use client";

/**
 * FastAPI-based scraper hook — replaces useScraperSocket + useScraperContent.
 *
 * Calls the Python FastAPI backend directly at /api/scraper/quick-scrape.
 * No socket.io, no Redux socket slices, no Next.js proxy.
 *
 * The backend returns NDJSON streaming. This hook buffers the full response
 * and extracts the scraped_pages result.
 */

import { useState, useCallback } from "react";
import { useBackendApi } from "@/hooks/useBackendApi";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { parseNdjsonStream } from "@/lib/api/stream-parser";

interface ScraperOverview {
    page_title?: string;
    url?: string;
    website?: string;
    char_count?: number;
    has_structured_content?: boolean;
    outline?: Record<string, string[]>;
    [key: string]: unknown;
}

interface ScraperLinks {
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
    textContent: string;
    overview: ScraperOverview;
    structuredData: object;
    organizedData: object;
    links: ScraperLinks;
    images: string[];
    mainImage: string | null;
    metadata: { execution_time_ms?: number };
    scrapedAt: string;
}

interface UseScraperApiReturn {
    data: ScraperResult | null;
    isLoading: boolean;
    hasError: boolean;
    error: string | null;
    scrapeUrl: (url: string) => Promise<ScraperResult | null>;
    reset: () => void;
}

export function useScraperApi(): UseScraperApiReturn {
    const api = useBackendApi();
    const [data, setData] = useState<ScraperResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scrapeUrl = useCallback(async (url: string): Promise<ScraperResult | null> => {
        setIsLoading(true);
        setError(null);
        setData(null);

        console.warn(
            '%c⚠️ FASTAPI MIGRATION [useScraperApi]: Calling /api/scraper/quick-scrape directly. ' +
            'The scraper pages should be updated to leverage the full quick-scrape options ' +
            '(stream mode, selective content flags, etc.) instead of hardcoded defaults.',
            'font-weight: bold; color: #ff9800; font-size: 12px;',
        );

        try {
            const requestBody = {
                urls: [url],
                anchor_size: 100,
                get_content_filter_removal_details: false,
                get_links: true,
                get_main_image: true,
                get_organized_data: true,
                get_overview: true,
                get_structured_data: true,
                get_text_data: true,
                include_anchors: true,
                include_highlighting_markers: false,
                include_media: true,
                include_media_description: true,
                include_media_links: true,
                use_cache: true,
            };

            const response = await api.post(ENDPOINTS.scraper.quickScrape, requestBody);

            if (!response.body) {
                throw new Error("No response body from scraper service");
            }

            let scraperData: { results: Array<Record<string, unknown>>; metadata?: Record<string, unknown> } | null = null;

            const { events } = parseNdjsonStream(response);
            for await (const event of events) {
                const e = event as unknown as Record<string, unknown>;
                if (e.response_type === "scraped_pages") {
                    scraperData = e as typeof scraperData;
                } else if (e.event === "data" && (e.data as Record<string, unknown>)?.response_type === "scraped_pages") {
                    scraperData = e.data as typeof scraperData;
                } else if (e.event === "error") {
                    throw new Error((e.data as Record<string, unknown>)?.message as string || "Scraping failed");
                }
            }

            if (!scraperData?.results?.length) {
                throw new Error("No data returned from scraper");
            }

            const first = scraperData.results[0] as Record<string, unknown>;
            if (first.status === "error") {
                throw new Error((first.error as string) || "Scraping failed");
            }

            const scraperResult: ScraperResult = {
                url: (first.url as string) || url,
                textContent: (first.text_data as string) || "",
                overview: (first.overview as ScraperOverview) || {},
                structuredData: (first.structured_data as object) || {},
                organizedData: (first.organized_data as object) || {},
                links: (first.links as ScraperLinks) || {},
                images: ((first.links as ScraperLinks)?.images || []),
                mainImage: (first.main_image as string) || null,
                metadata: (scraperData.metadata as { execution_time_ms?: number }) || {},
                scrapedAt: (first.scraped_at as string) || new Date().toISOString(),
            };

            setData(scraperResult);
            return scraperResult;
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Failed to scrape URL";
            setError(errMsg);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setIsLoading(false);
    }, []);

    return {
        data,
        isLoading,
        hasError: !!error,
        error,
        scrapeUrl,
        reset,
    };
}
