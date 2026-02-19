import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URLS } from '@/lib/api/endpoints';

/**
 * API route to proxy scraper requests to the Python backend.
 * This allows public routes to access the scraper without socket.io.
 * 
 * POST /api/scraper/content
 * Body: { url: string }
 * 
 * Returns the scraped content with text, overview, and structured data.
 */

interface QuickScrapeRequest {
    urls: string[];
    anchor_size?: number;
    get_content_filter_removal_details?: boolean;
    get_links?: boolean;
    get_main_image?: boolean;
    get_organized_data?: boolean;
    get_overview?: boolean;
    get_structured_data?: boolean;
    get_text_data?: boolean;
    include_anchors?: boolean;
    include_highlighting_markers?: boolean;
    include_media?: boolean;
    include_media_description?: boolean;
    include_media_links?: boolean;
    use_cache?: boolean;
}

interface ScrapedPageResult {
    status: 'success' | 'error';
    url: string;
    error?: string;
    overview?: {
        page_title?: string;
        url?: string;
        website?: string;
        char_count?: number;
        has_structured_content?: boolean;
        outline?: Record<string, string[]>;
        [key: string]: unknown;
    };
    text_data?: string;
    structured_data?: object;
    organized_data?: object;
    links?: {
        internal?: string[];
        external?: string[];
        images?: string[];
        documents?: string[];
        [key: string]: unknown;
    };
    main_image?: string;
    scraped_at?: string;
}

interface ScraperResponse {
    response_type: 'scraped_pages';
    metadata?: {
        execution_time_ms?: number;
    };
    results: ScrapedPageResult[];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // Get backend URL from single source of truth
        const BACKEND_URL = BACKEND_URLS.production;

        // Forward the Authorization header from the client request
        const authHeader = request.headers.get('Authorization');

        // Build scraper request with default options for content extraction
        const scraperRequest: QuickScrapeRequest = {
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

        // Call the Python backend scraper API
        const backendHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (authHeader) {
            backendHeaders['Authorization'] = authHeader;
        }
        const response = await fetch(`${BACKEND_URL}/api/scraper/quick-scrape`, {
            method: 'POST',
            headers: backendHeaders,
            body: JSON.stringify(scraperRequest),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Scraper API error:', response.status, errorText);
            return NextResponse.json(
                { error: `Scraper service error: ${response.status}` },
                { status: response.status }
            );
        }

        // The backend returns NDJSON streaming response
        // We need to read all chunks and parse the final result
        if (!response.body) {
            return NextResponse.json(
                { error: 'No response body from scraper service' },
                { status: 500 }
            );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let scraperData: ScraperResponse | null = null;

        // Read the streaming response
        while (true) {
            const { value, done } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines (NDJSON format)
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const event = JSON.parse(line);
                        
                        // Look for the scraped_pages response
                        if (event.response_type === 'scraped_pages') {
                            scraperData = event;
                        } else if (event.event === 'data' && event.data?.response_type === 'scraped_pages') {
                            scraperData = event.data;
                        } else if (event.event === 'error') {
                            return NextResponse.json(
                                { error: event.data?.message || 'Scraping failed' },
                                { status: 500 }
                            );
                        }
                    } catch (e) {
                        // Skip malformed lines
                        console.warn('Failed to parse scraper event:', line);
                    }
                }
            }
        }

        // Process remaining buffer
        if (buffer.trim()) {
            try {
                const event = JSON.parse(buffer);
                if (event.response_type === 'scraped_pages') {
                    scraperData = event;
                } else if (event.event === 'data' && event.data?.response_type === 'scraped_pages') {
                    scraperData = event.data;
                }
            } catch (e) {
                console.warn('Failed to parse final scraper event:', buffer);
            }
        }

        if (!scraperData || !scraperData.results || scraperData.results.length === 0) {
            return NextResponse.json(
                { error: 'No data returned from scraper' },
                { status: 500 }
            );
        }

        const firstResult = scraperData.results[0];

        if (firstResult.status === 'error') {
            return NextResponse.json(
                { error: firstResult.error || 'Scraping failed' },
                { status: 500 }
            );
        }

        // Return the scraped content in a simplified format
        return NextResponse.json({
            url: firstResult.url || url,
            overview: firstResult.overview || {},
            textContent: firstResult.text_data || '',
            structuredData: firstResult.structured_data || {},
            organizedData: firstResult.organized_data || {},
            links: firstResult.links || {},
            mainImage: firstResult.main_image || null,
            scrapedAt: firstResult.scraped_at || new Date().toISOString(),
            metadata: scraperData.metadata || {},
        });

    } catch (error) {
        console.error('Scraper content route error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to scrape content' },
            { status: 500 }
        );
    }
}
