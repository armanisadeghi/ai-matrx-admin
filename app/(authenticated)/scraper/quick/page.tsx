"use client";
import { useState } from "react";
import { useScraperContent } from "@/features/scraper/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Copy, CheckCircle, ExternalLink } from "lucide-react";

export default function QuickScrapePage() {
    const [url, setUrl] = useState("");
    const { scrapeUrl, data, isLoading, hasError, error, reset } = useScraperContent();
    const [copied, setCopied] = useState(false);

    const handleScrape = async () => {
        if (!url.trim()) return;

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            return;
        }

        try {
            await scrapeUrl(url);
        } catch (err) {
            console.error("Failed to scrape:", err);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isLoading) {
            handleScrape();
        }
    };

    const handleCopy = async () => {
        if (data?.textContent) {
            await navigator.clipboard.writeText(data.textContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleNewScrape = () => {
        reset();
        setUrl("");
    };

    return (
        <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-textured">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-2 mb-3">
                        <Search className="w-5 h-5 text-gray-500" />
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Quick Scrape
                        </h1>
                    </div>
                    
                    <div className="flex gap-2">
                        <Input
                            type="url"
                            placeholder="Enter URL to scrape..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading}
                            className="flex-1"
                        />
                        {data ? (
                            <Button onClick={handleNewScrape} variant="outline">
                                New Scrape
                            </Button>
                        ) : (
                            <Button
                                onClick={handleScrape}
                                disabled={isLoading || !url.trim()}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Scraping...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4 mr-2" />
                                        Scrape
                                    </>
                                )}
                            </Button>
                        )}
                    </div>

                    {hasError && (
                        <Alert variant="destructive" className="mt-3">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4">
                <div className="max-w-5xl mx-auto">
                    {isLoading && !data && (
                        <Card>
                            <CardContent className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Scraping content...
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {data && (
                        <div className="space-y-4">
                            {/* Overview Card */}
                            <Card>
                                <CardContent className="pt-6 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                                {data.overview.page_title || "Untitled Page"}
                                            </h2>
                                            <a
                                                href={data.overview.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                                            >
                                                <span className="truncate">{data.overview.url}</span>
                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            </a>
                                        </div>
                                        <Button
                                            onClick={handleCopy}
                                            variant="outline"
                                            size="sm"
                                            className="flex-shrink-0"
                                        >
                                            {copied ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copy Text
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        <div>
                                            <span className="font-medium">Characters:</span>{" "}
                                            {data.overview.char_count?.toLocaleString() || 0}
                                        </div>
                                        <div>
                                            <span className="font-medium">Words:</span>{" "}
                                            {Math.round((data.overview.char_count || 0) / 5.5).toLocaleString()}
                                        </div>
                                        {data.images.length > 0 && (
                                            <div>
                                                <span className="font-medium">Images:</span>{" "}
                                                {data.images.length}
                                            </div>
                                        )}
                                        {(data.links.internal?.length || 0) > 0 && (
                                            <div>
                                                <span className="font-medium">Internal Links:</span>{" "}
                                                {data.links.internal?.length || 0}
                                            </div>
                                        )}
                                        {(data.links.external?.length || 0) > 0 && (
                                            <div>
                                                <span className="font-medium">External Links:</span>{" "}
                                                {data.links.external?.length || 0}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Content Card */}
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                                        Extracted Content
                                    </h3>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                        <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                                            {data.textContent}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {!isLoading && !data && !hasError && (
                        <Card>
                            <CardContent className="flex items-center justify-center py-16">
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">Enter a URL above to quickly extract content</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

