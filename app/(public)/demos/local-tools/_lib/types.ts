// ---------------------------------------------------------------------------
// Shared types for Matrx Local demo pages
// ---------------------------------------------------------------------------

export interface ToolResult {
    id?: string;
    type: 'success' | 'error';
    output: string;
    image?: { media_type: string; base64_data: string };
    metadata?: Record<string, unknown>;
}

export interface LogEntry {
    id: string;
    timestamp: Date;
    direction: 'sent' | 'received';
    tool?: string;
    data: unknown;
}

export interface ConnectionInfo {
    url: string;
    ws: string;
    port: number;
}

// Scrape-specific metadata
export interface ScrapeResultMeta {
    status: 'success' | 'error';
    url: string;
    status_code?: number;
    content_type?: string;
    from_cache?: boolean;
    cms?: 'wordpress' | 'shopify' | 'unknown';
    firewall?: 'cloudflare' | 'aws_waf' | 'datadome' | 'none';
    error?: string;
    overview?: Record<string, unknown>;
    links?: Record<string, unknown>;
    elapsed_ms?: number;
}

export interface BatchScrapeMetadata {
    results: ScrapeResultMeta[];
    total: number;
    success_count: number;
    elapsed_ms: number;
}

export interface SearchResult {
    keyword: string;
    title: string;
    url: string;
    description: string;
    age?: string;
}

export interface SearchMetadata {
    results: SearchResult[];
    total: number;
    elapsed_ms: number;
}

export interface ResearchMetadata {
    query: string;
    pages_scraped: number;
    pages_failed: number;
    elapsed_ms: number;
    content_length: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'discovering';
