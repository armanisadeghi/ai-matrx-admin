"use client";

import React, { useState } from "react";
import { ChevronLeft, Globe, Loader2, ExternalLink, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useScraperContent } from "@/features/scraper/hooks";

interface WebpageContent {
    url: string;
    title: string;
    textContent: string;
    charCount: number;
    scrapedAt: string;
}

interface WebpageResourcePickerProps {
    onBack: () => void;
    onSelect: (content: WebpageContent) => void;
}

export function WebpageResourcePicker({ onBack, onSelect }: WebpageResourcePickerProps) {
    const [url, setUrl] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const { scrapeUrl, data, isLoading, hasError, error, reset } = useScraperContent();

    const handleScrape = async () => {
        if (!url.trim()) return;
        
        try {
            await scrapeUrl(url.trim());
            setShowPreview(true);
        } catch (err) {
            console.error('Scraping failed:', err);
        }
    };

    const handleConfirm = () => {
        if (!data) return;
        
        onSelect({
            url,
            title: data.overview.page_title || url,
            textContent: data.textContent,
            charCount: data.overview.char_count || data.textContent.length,
            scrapedAt: data.scrapedAt
        });
        
        setShowPreview(false);
        reset();
        setUrl("");
    };

    const handleClosePreview = () => {
        setShowPreview(false);
        reset();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isLoading) {
            handleScrape();
        }
    };

    return (
        <>
            <div className="flex flex-col h-[400px]">
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={onBack}
                        disabled={isLoading}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Globe className="w-4 h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
                        Webpage Content
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                        {/* URL Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Enter URL
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="url"
                                    placeholder="https://example.com"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isLoading}
                                    className="flex-1 h-9 text-sm"
                                />
                                <Button
                                    onClick={handleScrape}
                                    disabled={!url.trim() || isLoading}
                                    className="h-9 px-4"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Scraping...
                                        </>
                                    ) : (
                                        <>
                                            <Globe className="w-4 h-4 mr-2" />
                                            Scrape
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                            <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                How it works
                            </h4>
                            <ul className="text-[10px] text-blue-600 dark:text-blue-300 space-y-0.5">
                                <li>• Enter any webpage URL</li>
                                <li>• We'll extract the text content</li>
                                <li>• Preview and confirm before adding</li>
                                <li>• Content will be included in your message</li>
                            </ul>
                        </div>

                        {/* Error Display */}
                        {hasError && (
                            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md">
                                <p className="text-xs text-red-600 dark:text-red-400">
                                    {error || 'Failed to scrape webpage'}
                                </p>
                            </div>
                        )}

                        {/* Recent/Example URLs (optional enhancement) */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Quick Examples
                            </label>
                            <div className="flex flex-wrap gap-1">
                                {[
                                    'https://example.com',
                                    'https://wikipedia.org',
                                ].map((exampleUrl) => (
                                    <button
                                        key={exampleUrl}
                                        onClick={() => setUrl(exampleUrl)}
                                        disabled={isLoading}
                                        className="text-[10px] px-2 py-1 rounded bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
                                    >
                                        {exampleUrl.replace('https://', '')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Loading state */}
                    {isLoading && (
                        <div className="flex-1 flex flex-col items-center justify-center mt-8">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500 mb-3" />
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                Scraping webpage...
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                This may take a few seconds
                            </p>
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            <Dialog open={showPreview} onOpenChange={handleClosePreview}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600 dark:text-green-500" />
                            <span>Webpage Content Preview</span>
                        </DialogTitle>
                    </DialogHeader>

                    {data && (
                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            {/* Metadata */}
                            <div className="flex-shrink-0 space-y-2">
                                <div className="flex items-start gap-2">
                                    <Globe className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {data.overview.page_title || 'Untitled Page'}
                                        </div>
                                        <a 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                                        >
                                            {url}
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                        </a>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex gap-4 text-[10px] text-gray-500 dark:text-gray-400">
                                    <span>{data.overview.char_count?.toLocaleString() || data.textContent.length.toLocaleString()} characters</span>
                                    <span>{Math.ceil((data.textContent.length) / 1000)} KB</span>
                                    {data.overview.has_structured_content && (
                                        <span className="text-green-600 dark:text-green-500">✓ Structured</span>
                                    )}
                                </div>
                            </div>

                            {/* Content Preview */}
                            <div className="flex-1 overflow-hidden border border-gray-200 dark:border-gray-700 rounded-md">
                                <div className="h-full overflow-y-auto p-4 bg-gray-50 dark:bg-zinc-900">
                                    <pre className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
                                        {data.textContent}
                                    </pre>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex-shrink-0 flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Content will be included in your message
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleClosePreview}
                                        className="h-8"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleConfirm}
                                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Add Content
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

