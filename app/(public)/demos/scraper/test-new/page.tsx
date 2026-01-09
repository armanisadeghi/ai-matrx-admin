"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { usePublicScraperStream } from "@/features/scraper/hooks/usePublicScraperStream";

/**
 * Test page for new scraper API with auth headers
 * 
 * This demonstrates the new direct FastAPI integration with proper auth handling:
 * - Uses useApiAuth hook for automatic auth/fingerprint headers
 * - Direct streaming from Python backend (no Socket.IO)
 * - Consistent with agent API pattern
 */
export default function TestNewScraperPage() {
    const [url, setUrl] = useState("");
    
    const {
        isLoading,
        error,
        results,
        statusMessage,
        quickScrape,
        reset,
    } = usePublicScraperStream({
        onStatusUpdate: (status, message) => {
            console.log('[Scraper] Status:', status, message);
        },
        onData: (data) => {
            console.log('[Scraper] Data received:', data);
        },
        onError: (error) => {
            console.error('[Scraper] Error:', error);
        },
        onComplete: () => {
            console.log('[Scraper] Complete');
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

        await quickScrape({
            urls: [url.trim()],
            get_text_data: true,
            get_overview: true,
            get_links: true,
            get_main_image: true,
            use_cache: false,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleScrape();
        }
    };

    const handleReset = () => {
        reset();
        setUrl("");
    };

    return (
        <div className="h-page flex flex-col overflow-hidden bg-textured">
            {/* Header */}
            <div className="flex-shrink-0 p-6 border-b border-border bg-card">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold mb-2 text-foreground">
                        New Scraper API Test
                    </h1>
                    <p className="text-sm text-muted-foreground mb-4">
                        Testing direct FastAPI integration with auth headers (Bearer token or X-Fingerprint-ID)
                    </p>
                    
                    <div className="flex gap-3">
                        <Input
                            type="url"
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            className="flex-1"
                        />
                        {results.length > 0 ? (
                            <Button onClick={handleReset} variant="outline">
                                Reset
                            </Button>
                        ) : (
                            <Button onClick={handleScrape} disabled={isLoading || !url.trim()}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Scraping...
                                    </>
                                ) : (
                                    'Scrape'
                                )}
                            </Button>
                        )}
                    </div>

                    {error && (
                        <Alert variant="destructive" className="mt-3">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {statusMessage && !error && (
                        <Alert className="mt-3">
                            <AlertDescription>{statusMessage}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                    {isLoading && results.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Scraping content...</p>
                            </div>
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="space-y-6">
                            {results.map((result, index) => (
                                <div key={index} className="bg-card border border-border rounded-lg p-6">
                                    <h2 className="text-xl font-semibold mb-2 text-foreground">
                                        {result.overview?.page_title || "Untitled Page"}
                                    </h2>
                                    
                                    {result.overview?.url && (
                                        <a
                                            href={result.overview.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline mb-4 block"
                                        >
                                            {result.overview.url}
                                        </a>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                        <div className="p-3 bg-muted rounded-lg">
                                            <div className="text-xs text-muted-foreground mb-1">Characters</div>
                                            <div className="text-lg font-semibold">
                                                {result.overview?.char_count?.toLocaleString() || 0}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-muted rounded-lg">
                                            <div className="text-xs text-muted-foreground mb-1">Internal Links</div>
                                            <div className="text-lg font-semibold">
                                                {result.links?.internal?.length || 0}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-muted rounded-lg">
                                            <div className="text-xs text-muted-foreground mb-1">External Links</div>
                                            <div className="text-lg font-semibold">
                                                {result.links?.external?.length || 0}
                                            </div>
                                        </div>
                                        <div className="p-3 bg-muted rounded-lg">
                                            <div className="text-xs text-muted-foreground mb-1">Images</div>
                                            <div className="text-lg font-semibold">
                                                {result.links?.images?.length || 0}
                                            </div>
                                        </div>
                                    </div>

                                    {result.text_data && (
                                        <div className="mt-4">
                                            <h3 className="text-sm font-medium mb-2 text-foreground">Text Content</h3>
                                            <div className="bg-muted rounded-lg p-4 max-h-96 overflow-auto">
                                                <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                                                    {result.text_data}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoading && results.length === 0 && !error && (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>Enter a URL above to test the new scraper API</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
