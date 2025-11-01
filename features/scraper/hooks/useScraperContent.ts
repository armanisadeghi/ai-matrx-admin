"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
    selectPrimaryResponseDataByTaskId,
    selectPrimaryResponseEndedByTaskId,
    selectPrimaryResponseErrorsByTaskId,
    selectTaskStatus,
} from "@/lib/redux/socket-io";
import { useScraperSocket } from "@/lib/redux/socket-io/hooks/useScraperSocket";
import ScraperDataUtils from "../utils/data-utils";

interface ScraperContentResult {
    // Text content (primary)
    textContent: string;
    
    // Other commonly used data
    organizedData: object;
    structuredData: object;
    overview: {
        page_title?: string;
        url?: string;
        website?: string;
        char_count?: number;
        has_structured_content?: boolean;
        outline?: { [key: string]: string[] };
        [key: string]: any;
    };
    links: {
        internal?: string[];
        external?: string[];
        images?: string[];
        documents?: string[];
        others?: string[];
        audio?: string[];
        videos?: string[];
        archives?: string[];
    };
    images: string[];
    mainImage: string | null;
    
    // Additional useful data
    metadata: {
        execution_time_ms?: number | null;
    };
    hashes: string[] | null;
    contentFilterDetails: any[];
    scrapedAt: string;
    
    // Raw processed data (for custom access)
    rawProcessedData: any;
}

interface UseScraperContentReturn {
    // Main data
    data: ScraperContentResult | null;
    
    // State flags
    isLoading: boolean;
    isCompleted: boolean;
    hasError: boolean;
    error: string | null;
    
    // Control methods
    scrapeUrl: (url: string) => Promise<void>;
    reset: () => void;
    
    // Task info
    taskId: string | null;
    taskStatus: string | null;
}

/**
 * A simplified hook for scraping URLs and extracting content.
 * 
 * This hook wraps the scraper socket functionality and handles data extraction,
 * providing easy access to text content and other scraped data.
 * 
 * @example
 * ```tsx
 * const { scrapeUrl, data, isLoading, hasError } = useScraperContent();
 * 
 * const handleScrape = async () => {
 *   await scrapeUrl("https://example.com");
 * };
 * 
 * // Access the text content
 * const textContent = data?.textContent;
 * ```
 */
export const useScraperContent = (): UseScraperContentReturn => {
    const { quickScrapeUrl } = useScraperSocket();
    const [taskId, setTaskId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Redux selectors
    const responses = useAppSelector((state) => 
        taskId ? selectPrimaryResponseDataByTaskId(taskId)(state) : []
    );
    const taskStatus = useAppSelector((state) => 
        taskId ? selectTaskStatus(state, taskId) : null
    );
    const isTaskCompleted = useAppSelector((state) => 
        taskId ? selectPrimaryResponseEndedByTaskId(taskId)(state) : false
    );
    const errors = useAppSelector((state) => 
        taskId ? selectPrimaryResponseErrorsByTaskId(taskId)(state) : []
    );

    // Calculate loading state
    const isLoading = useMemo(() => {
        return taskStatus === "submitted" && !isTaskCompleted;
    }, [taskStatus, isTaskCompleted]);

    // Calculate error state
    const hasError = useMemo(() => {
        return !!error || (errors && errors.length > 0);
    }, [error, errors]);

    // Process the scraped data
    const processedData = useMemo(() => {
        if (!responses || responses.length === 0) {
            return null;
        }

        try {
            // Filter out initialization messages
            const contentResponses = responses.filter((response) => {
                if (!response) return false;

                // Skip initialization messages
                if (
                    typeof response === "object" &&
                    response.status === "success" &&
                    response.message === "initialized"
                ) {
                    return false;
                }

                return true;
            });

            if (contentResponses.length === 0) {
                return null;
            }

            // Process the first response (or we could process all)
            const firstResponse = contentResponses[0];
            const processed = ScraperDataUtils.processFullData(firstResponse);

            // Extract the first result
            const firstResult = processed.results?.[0];
            if (!firstResult) {
                return null;
            }

            return {
                processed,
                firstResult,
            };
        } catch (err) {
            console.error("[useScraperContent] Error processing data:", err);
            setError(err instanceof Error ? err.message : "Failed to process scraped data");
            return null;
        }
    }, [responses]);

    // Extract the content in a structured format
    const data = useMemo<ScraperContentResult | null>(() => {
        if (!processedData) {
            return null;
        }

        const { processed, firstResult } = processedData;

        return {
            // Primary content
            textContent: firstResult.text_data || "",

            // Common data
            organizedData: firstResult.organized_data || {},
            structuredData: firstResult.structured_data || {},
            overview: firstResult.overview || {},
            links: firstResult.links || {},
            images: firstResult.links?.images || [],
            mainImage: firstResult.main_image || null,

            // Additional data
            metadata: processed.metadata || {},
            hashes: firstResult.hashes || null,
            contentFilterDetails: firstResult.content_filter_removal_details || [],
            scrapedAt: firstResult.scraped_at || "",

            // Raw data for custom access
            rawProcessedData: processed,
        };
    }, [processedData]);

    // Method to trigger a scrape
    const scrapeUrl = useCallback(
        async (url: string) => {
            try {
                setError(null);
                const newTaskId = await quickScrapeUrl(url);
                setTaskId(newTaskId);
            } catch (err) {
                console.error("[useScraperContent] Error scraping URL:", err);
                setError(err instanceof Error ? err.message : "Failed to scrape URL");
                throw err;
            }
        },
        [quickScrapeUrl]
    );

    // Method to reset the hook state
    const reset = useCallback(() => {
        setTaskId(null);
        setError(null);
    }, []);

    // Update error state when errors come from Redux
    useEffect(() => {
        if (errors && errors.length > 0) {
            const errorMessage = errors.map((err) => err.user_visible_message).join(", ");
            setError(errorMessage);
        }
    }, [errors]);

    return {
        data,
        isLoading,
        isCompleted: isTaskCompleted,
        hasError,
        error,
        scrapeUrl,
        reset,
        taskId,
        taskStatus,
    };
};

export type UseScraperContent = ReturnType<typeof useScraperContent>;

