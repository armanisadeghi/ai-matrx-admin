"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, Send, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoPageLayout } from "../_components/DemoPageLayout";
import { ResponseViewer } from "../_components/ResponseViewer";
import { usePublicScraperStream } from "@/features/scraper/hooks/usePublicScraperStream";
import type { SearchResult } from "@/features/scraper/types/scraper-api";

// Individual search result item (nested within SearchResult.results)
interface SearchResultItem {
    title?: string;
    url?: string;
    snippet?: string;
    rank?: number;
}

interface SearchResponse {
    response_type?: string;
    results?: SearchResultItem[];
    query?: string;
    total_results?: number;
    [key: string]: unknown;
}

// Rendered content component for search results
function RenderedContent({ data }: { data: SearchResponse }) {
    const results: SearchResultItem[] = data?.results || [];
    
    if (results.length === 0) {
        return (
            <div className="p-6 text-center">
                <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No search results found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different keyword</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-3">
            {data.query && (
                <div className="text-sm text-gray-500 mb-4">
                    Showing {results.length} results for "{data.query}"
                </div>
            )}
            
            {results.map((result, index) => (
                <div 
                    key={index}
                    className="p-4 bg-white dark:bg-zinc-800 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-zinc-700 rounded shrink-0">
                            <Globe className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <a 
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 dark:text-blue-400 hover:underline line-clamp-1"
                            >
                                {result.title || result.url || `Result ${index + 1}`}
                            </a>
                            {result.url && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{result.url}</p>
                            )}
                            {result.snippet && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                                    {result.snippet}
                                </p>
                            )}
                        </div>
                        {result.url && (
                            <a 
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded shrink-0"
                            >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function SearchDemoPage() {
    const [keywords, setKeywords] = useState("");
    const [maxResults, setMaxResults] = useState("10");
    const [searchData, setSearchData] = useState<SearchResponse | null>(null);

    const {
        isLoading,
        error,
        searchResults,
        searchKeywords,
    } = usePublicScraperStream({
        onData: (data) => {
            console.log('[Search] Data received:', data);
            setSearchData(data as SearchResponse);
        },
    });

    const handleSearch = async () => {
        if (!keywords.trim()) return;

        setSearchData(null);
        await searchKeywords({
            keywords: [keywords.trim()],
            total_results_per_keyword: parseInt(maxResults) || 10,
        });
    };

    // Sync searchResults to response format
    useEffect(() => {
        if (searchResults.length > 0 && !searchData) {
            // Flatten SearchResult[] (which has nested results arrays) to SearchResultItem[]
            const flatResults: SearchResultItem[] = searchResults.flatMap(
                (sr) => sr.results || []
            );
            setSearchData({ results: flatResults });
        }
    }, [searchResults, searchData]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleSearch();
        }
    };

    const inputSection = (
        <div className="flex gap-3 items-end">
            <div className="flex-1">
                <Label htmlFor="keywords" className="text-xs text-gray-500 mb-1">Keywords</Label>
                <Input
                    id="keywords"
                    type="text"
                    placeholder="Enter search keywords..."
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="text-base"
                />
            </div>
            <div className="w-24">
                <Label htmlFor="maxResults" className="text-xs text-gray-500 mb-1">Max Results</Label>
                <Input
                    id="maxResults"
                    type="number"
                    min="1"
                    max="100"
                    value={maxResults}
                    onChange={(e) => setMaxResults(e.target.value)}
                    disabled={isLoading}
                    className="text-base"
                />
            </div>
            <Button 
                onClick={handleSearch} 
                disabled={!keywords.trim() || isLoading}
                className="px-6"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                    </>
                ) : (
                    <>
                        <Search className="w-4 h-4 mr-2" />
                        Search
                    </>
                )}
            </Button>
        </div>
    );

    return (
        <DemoPageLayout
            title="Search Keywords"
            description="Search the web for keywords without scraping"
            inputSection={inputSection}
        >
            <ResponseViewer
                data={searchData}
                isLoading={isLoading}
                error={error}
                title="Search Results"
                renderContent={(data) => <RenderedContent data={data as SearchResponse} />}
            />
        </DemoPageLayout>
    );
}
