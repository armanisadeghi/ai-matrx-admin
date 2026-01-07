"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, File, Loader2, AlertCircle, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicResource } from "../../types/content";

interface PublicFileUrlPickerProps {
    onBack: () => void;
    onSelect: (resource: PublicResource) => void;
    onSwitchTo?: (type: 'webpage' | 'youtube' | 'image_link', url: string) => void;
    initialUrl?: string;
}

// Detect URL type
function detectUrlType(url: string): 'youtube' | 'image' | 'webpage' | 'file' | null {
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

// Get mime type from extension
function getMimeType(pathname: string): string {
    const lower = pathname.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.doc')) return 'application/msword';
    if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
    if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (lower.endsWith('.txt')) return 'text/plain';
    if (lower.endsWith('.csv')) return 'text/csv';
    if (lower.endsWith('.json')) return 'application/json';
    if (lower.endsWith('.xml')) return 'application/xml';
    if (lower.endsWith('.zip')) return 'application/zip';
    if (lower.endsWith('.md')) return 'text/markdown';
    return 'application/octet-stream';
}

// Get filename from URL
function getFilename(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const parts = pathname.split('/');
        return parts[parts.length - 1] || 'file';
    } catch {
        return 'file';
    }
}

export function PublicFileUrlPicker({ onBack, onSelect, onSwitchTo, initialUrl }: PublicFileUrlPickerProps) {
    const [url, setUrl] = useState(initialUrl || "");
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestedType, setSuggestedType] = useState<'webpage' | 'youtube' | 'image_link' | null>(null);
    const [fileInfo, setFileInfo] = useState<{ url: string; filename: string; mimeType: string } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
        if (initialUrl?.trim()) {
            handleValidate();
        }
    }, [initialUrl]);

    const handleValidate = () => {
        setError(null);
        setSuggestedType(null);
        setFileInfo(null);

        if (!url.trim()) {
            setError("Please enter a file URL");
            return;
        }

        setIsValidating(true);

        try {
            const urlObj = new URL(url.trim());
            if (!urlObj.protocol.startsWith('http')) {
                setError('URL must use HTTP or HTTPS protocol');
                setIsValidating(false);
                return;
            }

            const detectedType = detectUrlType(url.trim());
            
            if (detectedType === 'youtube') {
                setError('This appears to be a YouTube URL');
                setSuggestedType('youtube');
                setIsValidating(false);
                return;
            }
            
            if (detectedType === 'image') {
                setError('This appears to be an image URL');
                setSuggestedType('image_link');
                setIsValidating(false);
                return;
            }

            if (detectedType === 'webpage') {
                setError('This appears to be a webpage. File URLs should end with a file extension.');
                setSuggestedType('webpage');
                setIsValidating(false);
                return;
            }

            const filename = getFilename(url.trim());
            const mimeType = getMimeType(urlObj.pathname);

            setFileInfo({
                url: url.trim(),
                filename,
                mimeType,
            });
        } catch {
            setError('Invalid URL format');
        }

        setIsValidating(false);
    };

    const handleSelect = () => {
        if (fileInfo) {
            const resource: PublicResource = {
                type: 'file_link',
                data: {
                    url: fileInfo.url,
                    filename: fileInfo.filename,
                    mime_type: fileInfo.mimeType,
                    type: fileInfo.mimeType,
                }
            };
            onSelect(resource);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isValidating) {
            handleValidate();
        }
    };

    return (
        <div className="flex flex-col h-[450px]">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={onBack}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <File className="w-4 h-4 flex-shrink-0 text-orange-600 dark:text-orange-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">File URL</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="https://example.com/document.pdf"
                            className="flex-1 text-xs h-8"
                            disabled={isValidating}
                        />
                        <Button
                            size="sm"
                            onClick={handleValidate}
                            disabled={isValidating || !url.trim()}
                            className="h-8 w-8 p-0"
                            variant="ghost"
                        >
                            {isValidating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                            )}
                        </Button>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Paste a direct URL to a file
                    </p>
                </div>

                {/* Error with suggestion */}
                {error && (
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                        </div>
                        {suggestedType && onSwitchTo && (
                            <Button
                                size="sm"
                                className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => onSwitchTo(suggestedType, url)}
                            >
                                <Globe className="w-3.5 h-3.5 mr-1.5" />
                                Switch to {suggestedType === 'webpage' ? 'Webpage' : suggestedType === 'youtube' ? 'YouTube' : 'Image URL'}
                            </Button>
                        )}
                    </div>
                )}

                {/* File Info */}
                {fileInfo && (
                    <div className="border border-border rounded-lg overflow-hidden">
                        <div className="p-4 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center">
                            <File className="w-12 h-12 text-orange-500" />
                        </div>
                        <div className="p-3 space-y-2 bg-white dark:bg-zinc-900">
                            <div>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Filename</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {fileInfo.filename}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Type</span>
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                    {fileInfo.mimeType}
                                </span>
                            </div>
                            <a
                                href={fileInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                            >
                                <span className="truncate">{fileInfo.url}</span>
                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </a>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                {!fileInfo && !error && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            <strong>Supported formats:</strong>
                        </p>
                        <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5 ml-3">
                            <li>• Documents: PDF, DOC, DOCX, TXT, MD</li>
                            <li>• Data: CSV, JSON, XML</li>
                            <li>• Spreadsheets: XLS, XLSX</li>
                            <li>• Archives: ZIP</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Footer with Add Button */}
            {fileInfo && (
                <div className="border-t border-border p-3">
                    <Button onClick={handleSelect} className="w-full" size="sm">
                        <File className="w-4 h-4 mr-2" />
                        Add File
                    </Button>
                </div>
            )}
        </div>
    );
}
