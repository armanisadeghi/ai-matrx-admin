"use client";

import React, { useState, useCallback } from "react";
import { Zap, Loader2, Search, Globe, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoPageLayout } from "../_components/DemoPageLayout";
import { ResponseViewer } from "../_components/ResponseViewer";

interface SearchAndScrapeResponse {
    response_type?: string;
    results?: Array<{
        url?: string;
        status?: string;
        overview?: {
            page_title?: string;
            char_count?: number;
        };
        text_data?: string;
        [key: string]: unknown;
    }>;
    metadata?: {
        execution_time_ms?: number;
    };
    [key: string]: unknown;
}

// Rendered content component
function RenderedContent({ data }: { data: SearchAndScrapeResponse }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const results = data?.results || [];
    
    if (results.length === 0) {
        return (
            <div className="p-6 text-center">
                <Globe className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No results found</p>
            </div>
        );
    }

    const selectedResult = results[selectedIndex];

    return (
        <div className="h-full flex">
            {/* Sidebar - List of results */}
            <div className="w-64 border-r border-border overflow-y-auto shrink-0">
                <div className="p-2 border-b border-border bg-gray-50 dark:bg-zinc-800">
                    <span className="text-xs text-gray-500">{results.length} pages scraped</span>
                </div>
                <div className="divide-y divide-border">
                    {results.map((result, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${
                                selectedIndex === index ? 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500' : ''
                            }`}
                        >
                            <p className="text-sm font-medium line-clamp-1">
                                {result.overview?.page_title || `Page ${index + 1}`}
                            </p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                {result.url}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    result.status === 'success' 
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                    {result.status || 'unknown'}
                                </span>
                                {result.overview?.char_count && (
                                    <span className="text-xs text-gray-400">
                                        {(result.overview.char_count / 1000).toFixed(1)}k chars
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {selectedResult && (
                    <Tabs defaultValue="overview" className="h-full flex flex-col">
                        <TabsList className="w-full justify-start rounded-none border-b border-border h-10 px-3 shrink-0">
                            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                            <TabsTrigger value="text" className="text-xs">Text</TabsTrigger>
                            <TabsTrigger value="raw" className="text-xs">Raw Data</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="flex-1 overflow-auto p-4 m-0">
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-lg font-semibold">
                                        {selectedResult.overview?.page_title || 'Untitled'}
                                    </h2>
                                    <a 
                                        href={selectedResult.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                        {selectedResult.url}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                                        <div className="text-xs text-gray-500 mb-1">Status</div>
                                        <div className={`font-semibold ${
                                            selectedResult.status === 'success' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {selectedResult.status || 'Unknown'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                                        <div className="text-xs text-gray-500 mb-1">Characters</div>
                                        <div className="font-semibold">
                                            {selectedResult.overview?.char_count?.toLocaleString() || 0}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                                        <div className="text-xs text-gray-500 mb-1">Properties</div>
                                        <div className="font-semibold">
                                            {Object.keys(selectedResult).length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="text" className="flex-1 overflow-auto m-0">
                            <div className="p-4">
                                {selectedResult.text_data ? (
                                    <pre className="whitespace-pre-wrap text-sm font-sans text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
                                        {selectedResult.text_data}
                                    </pre>
                                ) : (
                                    <p className="text-gray-500">No text content</p>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="raw" className="flex-1 overflow-auto m-0">
                            <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                                {JSON.stringify(selectedResult, null, 2)}
                            </pre>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}

export default function SearchAndScrapeDemoPage() {
    const [keyword, setKeyword] = useState("");
    const [maxPages, setMaxPages] = useState("5");
    const [useCache, setUseCache] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<SearchAndScrapeResponse | null>(null);

    const handleSearchAndScrape = useCallback(async () => {
        if (!keyword.trim()) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://server.app.matrxserver.com';
            
            const request = {
                keyword: keyword.trim(),
                max_pages: parseInt(maxPages) || 5,
                scrape_options: {
                    get_text_data: true,
                    get_overview: true,
                    get_links: true,
                    use_cache: useCache,
                },
            };

            const res = await fetch(`${BACKEND_URL}/api/scraper/search-and-scrape-limited`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            }

            // Handle streaming NDJSON response
            if (!res.body) {
                throw new Error('No response body');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let responseData: SearchAndScrapeResponse | null = null;

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const event = JSON.parse(line);
                            if (event.response_type === 'scraped_pages') {
                                responseData = event;
                            } else if (event.event === 'data' && event.data?.response_type === 'scraped_pages') {
                                responseData = event.data;
                            } else if (event.event === 'error') {
                                throw new Error(event.data?.message || 'Operation failed');
                            } else if (!event.event && event.results) {
                                responseData = event;
                            }
                        } catch (e) {
                            if (e instanceof SyntaxError) continue;
                            throw e;
                        }
                    }
                }
            }

            // Process remaining buffer
            if (buffer.trim()) {
                try {
                    const event = JSON.parse(buffer);
                    if (event.response_type === 'scraped_pages' || event.results) {
                        responseData = event;
                    }
                } catch (e) {
                    // Ignore
                }
            }

            setResponse(responseData || { results: [] });
        } catch (err) {
            console.error('Search and scrape error:', err);
            setError(err instanceof Error ? err.message : 'Operation failed');
        } finally {
            setIsLoading(false);
        }
    }, [keyword, maxPages, useCache]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleSearchAndScrape();
        }
    };

    const inputSection = (
        <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
                <Label htmlFor="keyword" className="text-xs text-gray-500 mb-1">Search Keyword</Label>
                <Input
                    id="keyword"
                    type="text"
                    placeholder="Enter keyword to search and scrape..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="text-base"
                />
            </div>
            <div className="w-24">
                <Label htmlFor="maxPages" className="text-xs text-gray-500 mb-1">Max Pages</Label>
                <Input
                    id="maxPages"
                    type="number"
                    min="1"
                    max="20"
                    value={maxPages}
                    onChange={(e) => setMaxPages(e.target.value)}
                    disabled={isLoading}
                    className="text-base"
                />
            </div>
            <div className="flex items-center gap-2 h-10">
                <Switch
                    id="useCache"
                    checked={useCache}
                    onCheckedChange={setUseCache}
                    disabled={isLoading}
                />
                <Label htmlFor="useCache" className="text-sm">Cache</Label>
            </div>
            <Button 
                onClick={handleSearchAndScrape} 
                disabled={!keyword.trim() || isLoading}
                className="px-6"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <Zap className="w-4 h-4 mr-2" />
                        Search & Scrape
                    </>
                )}
            </Button>
        </div>
    );

    return (
        <DemoPageLayout
            title="Search & Scrape"
            description="Search for a keyword and automatically scrape the results"
            inputSection={inputSection}
        >
            <ResponseViewer
                data={response}
                isLoading={isLoading}
                error={error}
                title="Search & Scrape Results"
                renderContent={(data) => <RenderedContent data={data as SearchAndScrapeResponse} />}
            />
        </DemoPageLayout>
    );
}
