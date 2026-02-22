/**
 * Scraper API Service
 * 
 * Direct calls to Python FastAPI scraper endpoints with streaming support.
 * Uses centralized auth handling via useApiAuth hook.
 * 
 * Backend URL is passed dynamically to support admin localhost override.
 */

import type {
  QuickScrapeRequest,
  SearchKeywordsRequest,
  SearchAndScrapeRequest,
  SearchAndScrapeLimitedRequest,
  ScraperStreamEvent,
} from '../types/scraper-api';
import { parseNdjsonStream } from '@/lib/api/stream-parser';

/**
 * Parse NDJSON stream from scraper API.
 *
 * Uses the shared read-ahead parser so the TCP reader loop runs independently
 * of the consumer. This prevents server-side GeneratorExit when large payloads
 * (e.g. scraped page content) cause consumer backpressure on the browser's
 * ReadableStream and fill the OS TCP receive buffer.
 */
async function* parseScraperStream(
  response: Response
): AsyncGenerator<ScraperStreamEvent> {
  const { events } = parseNdjsonStream(response);
  for await (const event of events) {
    yield event as unknown as ScraperStreamEvent;
  }
}

/**
 * Quick scrape - scrape multiple URLs
 */
export async function* quickScrape(
  request: QuickScrapeRequest,
  headers: Record<string, string>,
  backendUrl: string,
  signal?: AbortSignal
): AsyncGenerator<ScraperStreamEvent> {
  const response = await fetch(`${backendUrl}/api/scraper/quick-scrape`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(`Quick scrape failed: ${response.status} - ${error.detail || error.message || 'Unknown error'}`);
  }

  yield* parseScraperStream(response);
}

/**
 * Search keywords - search without scraping
 */
export async function* searchKeywords(
  request: SearchKeywordsRequest,
  headers: Record<string, string>,
  backendUrl: string,
  signal?: AbortSignal
): AsyncGenerator<ScraperStreamEvent> {
  const response = await fetch(`${backendUrl}/api/scraper/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(`Search failed: ${response.status} - ${error.detail || error.message || 'Unknown error'}`);
  }

  yield* parseScraperStream(response);
}

/**
 * Search and scrape - search keywords and scrape results
 */
export async function* searchAndScrape(
  request: SearchAndScrapeRequest,
  headers: Record<string, string>,
  backendUrl: string,
  signal?: AbortSignal
): AsyncGenerator<ScraperStreamEvent> {
  const response = await fetch(`${backendUrl}/api/scraper/search-and-scrape`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(`Search and scrape failed: ${response.status} - ${error.detail || error.message || 'Unknown error'}`);
  }

  yield* parseScraperStream(response);
}

/**
 * Search and scrape limited - search single keyword with limited results
 */
export async function* searchAndScrapeLimited(
  request: SearchAndScrapeLimitedRequest,
  headers: Record<string, string>,
  backendUrl: string,
  signal?: AbortSignal
): AsyncGenerator<ScraperStreamEvent> {
  const response = await fetch(`${backendUrl}/api/scraper/search-and-scrape-limited`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(`Search and scrape limited failed: ${response.status} - ${error.detail || error.message || 'Unknown error'}`);
  }

  yield* parseScraperStream(response);
}

/**
 * Mic check - test endpoint
 */
export async function* micCheck(
  headers: Record<string, string>,
  backendUrl: string,
  signal?: AbortSignal
): AsyncGenerator<ScraperStreamEvent> {
  const response = await fetch(`${backendUrl}/api/scraper/mic-check`, {
    method: 'POST',
    headers,
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(`Mic check failed: ${response.status} - ${error.detail || error.message || 'Unknown error'}`);
  }

  yield* parseScraperStream(response);
}
