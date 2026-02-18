"use client";
import { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useScraperContent } from "@/features/scraper/hooks";
import { useScraperSocket } from "@/lib/redux/socket-io/hooks/useScraperSocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Copy, CheckCircle, ExternalLink, ScanSearch } from "lucide-react";

export default function QuickScrapePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [url, setUrl] = useState(searchParams.get("url") ?? "");
    const { scrapeUrl, data, isLoading, hasError, error, reset } = useScraperContent();
    const { quickScrapeUrl } = useScraperSocket();
    const [copied, setCopied] = useState(false);
    const [isFullScraping, setIsFullScraping] = useState(false);
    const [, startTransition] = useTransition();

    // Auto-scrape when arriving with a URL query param
    useEffect(() => {
        const initialUrl = searchParams.get("url");
        if (initialUrl) {
            try {
                new URL(initialUrl);
                scrapeUrl(initialUrl).catch(console.error);
            } catch {
                // invalid URL, ignore
            }
        }
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleScrape = async () => {
        if (!url.trim()) return;
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
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

    const handleFullScrape = async () => {
        const targetUrl = url.trim();
        if (!targetUrl) return;
        try {
            new URL(targetUrl);
        } catch {
            return;
        }
        setIsFullScraping(true);
        try {
            const taskId = await quickScrapeUrl(targetUrl);
            startTransition(() => {
                router.push(`/scraper/${taskId}`);
            });
        } catch (err) {
            console.error("Full scrape failed:", err);
        } finally {
            setIsFullScraping(false);
        }
    };

    return (
        <div className="h-page flex flex-col overflow-hidden bg-textured">
            {/* Compact header bar */}
            <div className="flex-shrink-0 px-3 py-2 border-b border-border bg-white/50 dark:bg-gray-900/50">
                <div className="max-w-5xl mx-auto flex gap-2 items-center">
                    <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                        type="url"
                        placeholder="Enter URL to scrape..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className="flex-1 h-8 text-sm"
                    />
                    {data ? (
                        <Button onClick={handleNewScrape} variant="outline" size="sm" className="flex-shrink-0">
                            New
                        </Button>
                    ) : (
                        <Button
                            onClick={handleScrape}
                            disabled={isLoading || !url.trim()}
                            size="sm"
                            className="flex-shrink-0"
                        >
                            {isLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                "Scrape"
                            )}
                        </Button>
                    )}
                    <Button
                        onClick={handleFullScrape}
                        disabled={isFullScraping || !url.trim()}
                        size="sm"
                        variant="secondary"
                        className="flex-shrink-0 gap-1.5"
                    >
                        {isFullScraping ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <ScanSearch className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Full Scrape</span>
                    </Button>
                </div>
                {hasError && (
                    <Alert variant="destructive" className="mt-2 max-w-5xl mx-auto py-2">
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                    </Alert>
                )}
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
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-border">
                                        <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
                                            {data.textContent}
                                        </pre>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {!isLoading && !data && !hasError && (
                        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                            <Search className="w-10 h-10 mb-3 opacity-40" />
                            <p className="text-sm">Enter a URL above to quickly extract content</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
