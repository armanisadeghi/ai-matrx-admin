"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Globe, Loader2, AlertCircle, ExternalLink, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PublicResource } from "../../types/content";

interface PublicWebpagePickerProps {
    onBack: () => void;
    onSelect: (resource: PublicResource) => void;
    onSwitchTo?: (type: 'youtube' | 'image_url' | 'file_url', url: string) => void;
    initialUrl?: string;
}

// Detect URL type
function detectUrlType(url: string): 'youtube' | 'image' | 'file' | 'webpage' | null {
    try {
        const urlObj = new URL(url);
        
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            return 'youtube';
        }
        
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
        const pathname = urlObj.pathname.toLowerCase();
        if (imageExtensions.some(ext => pathname.endsWith(ext))) {
            return 'image';
        }
        
        const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json', '.xml', '.zip', '.md'];
        if (fileExtensions.some(ext => pathname.endsWith(ext))) {
            return 'file';
        }
        
        return 'webpage';
    } catch {
        return null;
    }
}

interface ScrapedContent {
    url: string;
    title: string;
    textContent: string;
    charCount: number;
    scrapedAt: string;
}

export function PublicWebpagePicker({ onBack, onSelect, onSwitchTo, initialUrl }: PublicWebpagePickerProps) {
    const [url, setUrl] = useState(initialUrl || "");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestedType, setSuggestedType] = useState<'youtube' | 'image_url' | 'file_url' | null>(null);
    const [scrapedData, setScrapedData] = useState<ScrapedContent | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [editedContent, setEditedContent] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
        if (initialUrl?.trim()) {
            handleScrape();
        }
    }, [initialUrl]);

    useEffect(() => {
        if (scrapedData?.textContent) {
            setEditedContent(scrapedData.textContent);
        }
    }, [scrapedData]);

    const handleScrape = async () => {
        if (!url.trim()) return;
        
        setError(null);
        setSuggestedType(null);

        // Check URL type first
        const detectedType = detectUrlType(url.trim());
        
        if (detectedType === 'youtube') {
            setSuggestedType('youtube');
            return;
        }
        
        if (detectedType === 'image') {
            setSuggestedType('image_url');
            return;
        }
        
        if (detectedType === 'file') {
            setSuggestedType('file_url');
            return;
        }

        setIsLoading(true);

        try {
            // Call the scraper API
            const response = await fetch('/api/scraper/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url.trim() }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to scrape webpage (${response.status})`);
            }

            const data = await response.json();
            
            const content: ScrapedContent = {
                url: url.trim(),
                title: data.overview?.page_title || url.trim(),
                textContent: data.textContent || '',
                charCount: (data.textContent || '').length,
                scrapedAt: new Date().toISOString(),
            };

            setScrapedData(content);
            setShowPreview(true);
        } catch (err) {
            console.error('Scraping failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to scrape webpage');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!scrapedData) return;

        const resource: PublicResource = {
            type: 'webpage',
            data: {
                url: scrapedData.url,
                title: scrapedData.title,
                text_content: editedContent,
                content: editedContent,
            }
        };

        onSelect(resource);
        handleClosePreview();
    };

    const handleClosePreview = () => {
        setShowPreview(false);
        setScrapedData(null);
        setEditedContent("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isLoading) {
            handleScrape();
        }
    };

    return (
        <>
            <div className="flex flex-col h-[450px]">
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={onBack}
                        disabled={isLoading}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Globe className="w-4 h-4 flex-shrink-0 text-teal-600 dark:text-teal-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
                        Webpage Content
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="space-y-3">
                            {/* URL Input */}
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        ref={inputRef}
                                        type="url"
                                        placeholder="https://example.com"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={isLoading}
                                        className="flex-1 text-xs h-8"
                                    />
                                    <Button
                                        onClick={handleScrape}
                                        disabled={!url.trim() || isLoading}
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        variant="ghost"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    Paste a webpage URL to extract its text content
                                </p>
                            </div>

                            {/* Suggestion to switch type */}
                            {suggestedType && onSwitchTo && (
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded">
                                        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-blue-700 dark:text-blue-400">
                                            This appears to be a {suggestedType === 'youtube' ? 'YouTube video' : suggestedType === 'image_url' ? 'image' : 'file'}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white"
                                        onClick={() => onSwitchTo(suggestedType, url)}
                                    >
                                        <Globe className="w-3.5 h-3.5 mr-1.5" />
                                        Switch to {suggestedType === 'youtube' ? 'YouTube' : suggestedType === 'image_url' ? 'Image URL' : 'File URL'}
                                    </Button>
                                </div>
                            )}

                            {/* Error Display */}
                            {error && (
                                <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded">
                                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                                </div>
                            )}

                            {/* Help Text */}
                            {!isLoading && !error && !suggestedType && (
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">
                                        <strong>How it works:</strong>
                                    </p>
                                    <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5 ml-3">
                                        <li>• Enter any webpage URL</li>
                                        <li>• We'll extract the text content</li>
                                        <li>• Preview and edit before adding</li>
                                    </ul>
                                </div>
                            )}

                            {/* Loading state */}
                            {isLoading && (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-500 mb-3" />
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Scraping webpage...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            <Dialog open={showPreview} onOpenChange={handleClosePreview}>
                <DialogContent className="max-w-4xl h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600 dark:text-green-500" />
                            <span>Webpage Content Preview</span>
                        </DialogTitle>
                    </DialogHeader>

                    {scrapedData && (
                        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                            {/* Metadata */}
                            <div className="flex-shrink-0 px-6 py-3 border-b border-border space-y-2">
                                <div className="flex items-start gap-2">
                                    <Globe className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {scrapedData.title}
                                        </div>
                                        <a 
                                            href={scrapedData.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                                        >
                                            {scrapedData.url}
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                        </a>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex gap-4 text-[10px] text-gray-500 dark:text-gray-400">
                                    <span>{editedContent.length.toLocaleString()} characters</span>
                                    {editedContent !== scrapedData.textContent && (
                                        <span className="text-orange-600 dark:text-orange-500">✏️ Edited</span>
                                    )}
                                </div>
                            </div>

                            {/* Content Preview - Editable */}
                            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                                <div className="flex items-center justify-between px-6 py-2 bg-gray-100 dark:bg-zinc-800 border-b border-border flex-shrink-0">
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Content (Editable)
                                    </span>
                                    {editedContent !== scrapedData.textContent && (
                                        <button
                                            onClick={() => setEditedContent(scrapedData.textContent)}
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Reset to original
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="flex-1 px-6 py-4 bg-white dark:bg-zinc-900 text-xs text-gray-900 dark:text-gray-100 font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 min-h-0"
                                    placeholder="Edit the scraped content here..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-border">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {editedContent !== scrapedData.textContent 
                                        ? "Content has been edited"
                                        : "Edit content above before adding"}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleClosePreview} className="h-8">
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={!editedContent.trim()}
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
