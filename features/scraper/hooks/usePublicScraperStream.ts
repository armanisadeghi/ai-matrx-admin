'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useApiAuth } from '@/hooks/useApiAuth';
import { selectIsUsingLocalhost } from '@/lib/redux/slices/adminPreferencesSlice';
import type {
  QuickScrapeRequest,
  SearchKeywordsRequest,
  SearchAndScrapeRequest,
  SearchAndScrapeLimitedRequest,
  ScraperStreamEvent,
  ScrapedResult,
  SearchResult,
} from '../types/scraper-api';
import * as scraperService from '../services/scraperApiService';

// ============================================================================
// TYPES
// ============================================================================

interface UsePublicScraperStreamOptions {
  onStatusUpdate?: (status: string, message?: string) => void;
  onData?: (data: unknown) => void;
  onError?: (error: string) => void;
  onComplete?: () => void;
}

interface UsePublicScraperStreamReturn {
  // State
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  results: ScrapedResult[];
  searchResults: SearchResult[];
  statusMessage: string | null;

  // Actions
  quickScrape: (request: QuickScrapeRequest) => Promise<void>;
  searchKeywords: (request: SearchKeywordsRequest) => Promise<void>;
  searchAndScrape: (request: SearchAndScrapeRequest) => Promise<void>;
  searchAndScrapeLimited: (request: SearchAndScrapeLimitedRequest) => Promise<void>;
  micCheck: () => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function usePublicScraperStream(
  options: UsePublicScraperStreamOptions = {}
): UsePublicScraperStreamReturn {
  const { onStatusUpdate, onData, onError, onComplete } = options;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScrapedResult[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auth
  const { getHeaders, waitForAuth, isAdmin } = useApiAuth();

  // Backend URL selection (admin can override to localhost via Redux)
  const useLocalhost = useSelector(selectIsUsingLocalhost);
  
  const getBackendUrl = useCallback(() => {
    const url = (isAdmin && useLocalhost) 
      ? 'http://localhost:8000'
      : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com');
    
    console.log('[Scraper Hook] Backend URL:', url, { isAdmin, useLocalhost });
    return url;
  }, [isAdmin, useLocalhost]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Process stream events
  const processStream = useCallback(
    async (streamGenerator: AsyncGenerator<ScraperStreamEvent>) => {
      try {
        setIsStreaming(true);
        setError(null);

        for await (const event of streamGenerator) {
          // Check if aborted
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }

          switch (event.event) {
            case 'status_update':
              const message = (event.data.user_message ?? event.data.user_visible_message) || event.data.system_message;
              setStatusMessage(message || null);
              onStatusUpdate?.(event.data.status, message);
              break;

            case 'data':
              // Check if it's a scraped result or search result
              if ('text_data' in event.data || 'overview' in event.data) {
                setResults((prev) => [...prev, event.data as ScrapedResult]);
              } else if ('keyword' in event.data || 'results' in event.data) {
                setSearchResults((prev) => [...prev, event.data as SearchResult]);
              }
              onData?.(event.data);
              break;

            case 'error':
              const errorMsg = (event.data.user_message ?? event.data.user_visible_message) || event.data.message;
              setError(errorMsg);
              onError?.(errorMsg);
              break;

            case 'end':
              setIsStreaming(false);
              onComplete?.();
              break;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Aborted - not an error
          setIsStreaming(false);
          return;
        }

        const errorMessage = err instanceof Error ? err.message : 'Stream processing failed';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [onStatusUpdate, onData, onError, onComplete]
  );

  // Quick scrape
  const quickScrape = useCallback(
    async (request: QuickScrapeRequest) => {
      setIsLoading(true);
      setError(null);
      setResults([]);
      setSearchResults([]);
      setStatusMessage(null);

      try {
        await waitForAuth();
        const headers = getHeaders();
        const backendUrl = getBackendUrl();

        abortControllerRef.current = new AbortController();
        const stream = scraperService.quickScrape(
          request,
          headers,
          backendUrl,
          abortControllerRef.current.signal
        );

        await processStream(stream);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Quick scrape failed';
        setError(errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
      }
    },
    [getHeaders, waitForAuth, getBackendUrl, processStream, onError]
  );

  // Search keywords
  const searchKeywords = useCallback(
    async (request: SearchKeywordsRequest) => {
      setIsLoading(true);
      setError(null);
      setResults([]);
      setSearchResults([]);
      setStatusMessage(null);

      try {
        await waitForAuth();
        const headers = getHeaders();
        const backendUrl = getBackendUrl();

        abortControllerRef.current = new AbortController();
        const stream = scraperService.searchKeywords(
          request,
          headers,
          backendUrl,
          abortControllerRef.current.signal
        );

        await processStream(stream);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
      }
    },
    [getHeaders, waitForAuth, getBackendUrl, processStream, onError]
  );

  // Search and scrape
  const searchAndScrape = useCallback(
    async (request: SearchAndScrapeRequest) => {
      setIsLoading(true);
      setError(null);
      setResults([]);
      setSearchResults([]);
      setStatusMessage(null);

      try {
        await waitForAuth();
        const headers = getHeaders();
        const backendUrl = getBackendUrl();

        abortControllerRef.current = new AbortController();
        const stream = scraperService.searchAndScrape(
          request,
          headers,
          backendUrl,
          abortControllerRef.current.signal
        );

        await processStream(stream);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search and scrape failed';
        setError(errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
      }
    },
    [getHeaders, waitForAuth, getBackendUrl, processStream, onError]
  );

  // Search and scrape limited
  const searchAndScrapeLimited = useCallback(
    async (request: SearchAndScrapeLimitedRequest) => {
      setIsLoading(true);
      setError(null);
      setResults([]);
      setSearchResults([]);
      setStatusMessage(null);

      try {
        await waitForAuth();
        const headers = getHeaders();
        const backendUrl = getBackendUrl();

        abortControllerRef.current = new AbortController();
        const stream = scraperService.searchAndScrapeLimited(
          request,
          headers,
          backendUrl,
          abortControllerRef.current.signal
        );

        await processStream(stream);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search and scrape limited failed';
        setError(errorMessage);
        onError?.(errorMessage);
        setIsLoading(false);
      }
    },
    [getHeaders, waitForAuth, getBackendUrl, processStream, onError]
  );

  // Mic check
  const micCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResults([]);
    setSearchResults([]);
    setStatusMessage(null);

    try {
      await waitForAuth();
      const headers = getHeaders();
      const backendUrl = getBackendUrl();
      
      console.log('[Scraper Hook] Mic Check - Backend URL:', backendUrl);
      console.log('[Scraper Hook] Mic Check - Headers:', { 
        hasAuth: !!headers.Authorization, 
        hasFingerprint: !!headers['X-Fingerprint-ID'],
        headerKeys: Object.keys(headers)
      });

      abortControllerRef.current = new AbortController();
      const stream = scraperService.micCheck(headers, backendUrl, abortControllerRef.current.signal);

      await processStream(stream);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Mic check failed';
      setError(errorMessage);
      onError?.(errorMessage);
      setIsLoading(false);
    }
  }, [getHeaders, waitForAuth, getBackendUrl, processStream, onError]);

  // Cancel current operation
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    cancel();
    setError(null);
    setResults([]);
    setSearchResults([]);
    setStatusMessage(null);
  }, [cancel]);

  return {
    // State
    isLoading,
    isStreaming,
    error,
    results,
    searchResults,
    statusMessage,

    // Actions
    quickScrape,
    searchKeywords,
    searchAndScrape,
    searchAndScrapeLimited,
    micCheck,
    cancel,
    reset,
  };
}
