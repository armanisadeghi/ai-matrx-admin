"use client";

import React, { useState, useEffect } from "react";
import { Globe, Loader2, Send, ExternalLink, FileText, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemoPageLayout } from "../_components/DemoPageLayout";
import { ResponseViewer } from "../_components/ResponseViewer";
import { usePublicScraperStream } from "@/features/scraper/hooks/usePublicScraperStream";

// Types for scraper response
interface ScraperOverview {
    page_title?: string;
    url?: string;
    website?: string;
    char_count?: number;
    has_structured_content?: boolean;
    outline?: Record<string, string[]>;
}

interface ScraperLinks {
    internal?: string[];
    external?: string[];
    images?: string[];
    documents?: string[];
}

interface ScraperResult {
    status: string;
    url: string;
    overview?: ScraperOverview;
    text_data?: string;
    structured_data?: object;
    organized_data?: object;
    links?: ScraperLinks;
    main_image?: string | null;
    scraped_at?: string;
}

interface ScraperResponse {
    response_type: string;
    metadata?: { execution_time_ms?: number };
    results: ScraperResult[];
}

// Rendered content component
function RenderedContent({ data }: { data: ScraperResponse }) {
    const [activeTab, setActiveTab] = useState("overview");
    
    if (!data?.results?.length) {
        return <div className="p-4 text-gray-500">No results found</div>;
    }

    const result = data.results[0];
    const overview = result.overview || {};
    const links = result.links || {};

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full justify-start rounded-none border-b border-border h-10 px-3 shrink-0">
                    <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                    <TabsTrigger value="text" className="text-xs">Text Content</TabsTrigger>
                    <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
                    <TabsTrigger value="structured" className="text-xs">Structured Data</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="flex-1 overflow-auto p-4 m-0">
                    <div className="space-y-4">
                        {/* Title & URL */}
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {overview.page_title || "Untitled Page"}
                            </h2>
                            <a 
                                href={result.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                {result.url}
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                                <div className="text-xs text-gray-500 mb-1">Characters</div>
                                <div className="text-lg font-semibold">{overview.char_count?.toLocaleString() || 0}</div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                                <div className="text-xs text-gray-500 mb-1">Internal Links</div>
                                <div className="text-lg font-semibold">{links.internal?.length || 0}</div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                                <div className="text-xs text-gray-500 mb-1">External Links</div>
                                <div className="text-lg font-semibold">{links.external?.length || 0}</div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                                <div className="text-xs text-gray-500 mb-1">Images</div>
                                <div className="text-lg font-semibold">{links.images?.length || 0}</div>
                            </div>
                        </div>

                        {/* Main Image */}
                        {result.main_image && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Main Image</h3>
                                <img 
                                    src={result.main_image} 
                                    alt="Main page image"
                                    className="max-w-md rounded-lg border border-border"
                                />
                            </div>
                        )}

                        {/* Outline */}
                        {overview.outline && Object.keys(overview.outline).length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Page Outline</h3>
                                <div className="space-y-1 bg-gray-50 dark:bg-zinc-800 p-3 rounded-lg">
                                    {Object.entries(overview.outline).map(([heading, content], index) => (
                                        <div key={index} className="text-sm">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{heading}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        {data.metadata?.execution_time_ms && (
                            <div className="text-xs text-gray-400">
                                Scraped in {data.metadata.execution_time_ms}ms at {result.scraped_at || new Date().toISOString()}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Text Content Tab */}
                <TabsContent value="text" className="flex-1 overflow-auto m-0">
                    <div className="p-4">
                        {result.text_data ? (
                            <div className="prose dark:prose-invert max-w-none">
                                <pre className="whitespace-pre-wrap text-sm font-sans text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
                                    {result.text_data}
                                </pre>
                            </div>
                        ) : (
                            <p className="text-gray-500">No text content extracted</p>
                        )}
                    </div>
                </TabsContent>

                {/* Links Tab */}
                <TabsContent value="links" className="flex-1 overflow-auto m-0">
                    <div className="p-4 space-y-6">
                        {/* Internal Links */}
                        {links.internal && links.internal.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4" />
                                    Internal Links ({links.internal.length})
                                </h3>
                                <div className="space-y-1 max-h-48 overflow-auto">
                                    {links.internal.slice(0, 50).map((link, i) => (
                                        <a 
                                            key={i}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                                        >
                                            {link}
                                        </a>
                                    ))}
                                    {links.internal.length > 50 && (
                                        <p className="text-xs text-gray-400">...and {links.internal.length - 50} more</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* External Links */}
                        {links.external && links.external.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    External Links ({links.external.length})
                                </h3>
                                <div className="space-y-1 max-h-48 overflow-auto">
                                    {links.external.slice(0, 50).map((link, i) => (
                                        <a 
                                            key={i}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-xs text-purple-600 dark:text-purple-400 hover:underline truncate"
                                        >
                                            {link}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Images */}
                        {links.images && links.images.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Images ({links.images.length})
                                </h3>
                                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-auto">
                                    {links.images.slice(0, 24).map((img, i) => (
                                        <a 
                                            key={i}
                                            href={img}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <img 
                                                src={img} 
                                                alt={`Image ${i + 1}`}
                                                className="w-full h-16 object-cover rounded border border-border hover:border-primary transition-colors"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* Structured Data Tab */}
                <TabsContent value="structured" className="flex-1 overflow-auto m-0">
                    <div className="p-4 space-y-4">
                        {result.structured_data && Object.keys(result.structured_data).length > 0 ? (
                            <pre className="text-xs bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg overflow-auto">
                                {JSON.stringify(result.structured_data, null, 2)}
                            </pre>
                        ) : (
                            <p className="text-gray-500">No structured data found</p>
                        )}

                        {result.organized_data && Object.keys(result.organized_data).length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Organized Data</h3>
                                <pre className="text-xs bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg overflow-auto">
                                    {JSON.stringify(result.organized_data, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function QuickScrapeDemoPage() {
    const [url, setUrl] = useState("");
    const [scraperData, setScraperData] = useState<ScraperResponse | null>(null);

    const {
        isLoading,
        error,
        results,
        quickScrape,
        reset,
    } = usePublicScraperStream({
        onData: (data) => {
            console.log('[Quick Scrape] Data received:', data);
            // Transform to old format
            if (data && typeof data === 'object' && 'response_type' in data) {
                setScraperData(data as ScraperResponse);
            } else {
                // Wrap in expected format
                setScraperData({
                    response_type: 'scraped_pages',
                    results: results.map(r => ({
                        status: 'success',
                        url: r.overview?.url || url,
                        overview: r.overview,
                        text_data: r.text_data,
                        structured_data: r.structured_data,
                        organized_data: r.organized_data,
                        links: r.links,
                        main_image: r.main_image,
                        scraped_at: r.scraped_at,
                    }))
                });
            }
        },
    });

    const handleScrape = async () => {
        if (!url.trim()) return;

        // Validate URL
        try {
            new URL(url);
        } catch {
            return;
        }

        setScraperData(null);
        await quickScrape({
            urls: [url.trim()],
            anchor_size: 100,
            get_content_filter_removal_details: true,
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
            use_cache: false,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleScrape();
        }
    };

    // Sync results to response format
    useEffect(() => {
        if (results.length > 0 && !scraperData) {
            setScraperData({
                response_type: 'scraped_pages',
                results: results.map(r => ({
                    status: 'success',
                    url: r.overview?.url || url,
                    overview: r.overview,
                    text_data: r.text_data,
                    structured_data: r.structured_data,
                    organized_data: r.organized_data,
                    links: r.links,
                    main_image: r.main_image,
                    scraped_at: r.scraped_at,
                }))
            });
        }
    }, [results, scraperData, url]);

    const inputSection = (
        <div className="flex gap-3 items-center">
            <div className="flex-1">
                <Input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="text-base"
                />
            </div>
            <Button 
                onClick={handleScrape} 
                disabled={!url.trim() || isLoading}
                className="px-6"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scraping...
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4 mr-2" />
                        Scrape
                    </>
                )}
            </Button>
        </div>
    );

    return (
        <DemoPageLayout
            title="Quick Scrape"
            description="Scrape a URL and view the extracted content"
            inputSection={inputSection}
        >
            <ResponseViewer
                data={scraperData}
                isLoading={isLoading}
                error={error}
                title="Scrape Results"
                renderContent={(data) => <RenderedContent data={data as ScraperResponse} />}
            />
        </DemoPageLayout>
    );
}
