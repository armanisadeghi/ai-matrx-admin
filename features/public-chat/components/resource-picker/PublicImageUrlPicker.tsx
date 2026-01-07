"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Image as ImageIcon, Loader2, AlertCircle, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicResource } from "../../types/content";

interface PublicImageUrlPickerProps {
    onBack: () => void;
    onSelect: (resource: PublicResource) => void;
    onSwitchTo?: (type: 'webpage' | 'youtube' | 'file_url', url: string) => void;
    initialUrl?: string;
}

// Detect URL type
function detectUrlType(url: string): 'youtube' | 'image' | 'webpage' | 'file' | null {
    try {
        const urlObj = new URL(url);
        
        // YouTube detection
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            return 'youtube';
        }
        
        // Image detection
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
        const pathname = urlObj.pathname.toLowerCase();
        if (imageExtensions.some(ext => pathname.endsWith(ext))) {
            return 'image';
        }
        
        // File detection
        const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json', '.xml', '.zip'];
        if (fileExtensions.some(ext => pathname.endsWith(ext))) {
            return 'file';
        }
        
        // Default to webpage
        return 'webpage';
    } catch {
        return null;
    }
}

// Validate if URL is an image
function validateImageUrl(url: string): { isValid: boolean; type?: string; error?: string; suggestedType?: 'webpage' | 'youtube' | 'file_url' } {
    try {
        const urlObj = new URL(url);
        if (!urlObj.protocol.startsWith('http')) {
            return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
        }

        const detectedType = detectUrlType(url);
        
        if (detectedType === 'youtube') {
            return { isValid: false, error: 'This appears to be a YouTube URL', suggestedType: 'youtube' };
        }
        
        if (detectedType === 'file') {
            return { isValid: false, error: 'This appears to be a file URL', suggestedType: 'file_url' };
        }
        
        if (detectedType === 'webpage') {
            return { isValid: false, error: 'This appears to be a webpage', suggestedType: 'webpage' };
        }

        // Determine MIME type from extension
        const pathname = urlObj.pathname.toLowerCase();
        let mimeType = 'image/jpeg';
        if (pathname.endsWith('.png')) mimeType = 'image/png';
        else if (pathname.endsWith('.gif')) mimeType = 'image/gif';
        else if (pathname.endsWith('.webp')) mimeType = 'image/webp';
        else if (pathname.endsWith('.svg')) mimeType = 'image/svg+xml';

        return { isValid: true, type: mimeType };
    } catch {
        return { isValid: false, error: 'Invalid URL format' };
    }
}

export function PublicImageUrlPicker({ onBack, onSelect, onSwitchTo, initialUrl }: PublicImageUrlPickerProps) {
    const [url, setUrl] = useState(initialUrl || "");
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestedType, setSuggestedType] = useState<'webpage' | 'youtube' | 'file_url' | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>('image/jpeg');
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
        setPreviewUrl(null);

        if (!url.trim()) {
            setError("Please enter an image URL");
            return;
        }

        setIsValidating(true);

        const validation = validateImageUrl(url.trim());

        if (!validation.isValid) {
            setError(validation.error || 'Invalid image URL');
            setSuggestedType(validation.suggestedType || null);
            setIsValidating(false);
            return;
        }

        setMimeType(validation.type || 'image/jpeg');
        setPreviewUrl(url.trim());
        setIsValidating(false);
    };

    const handleSelect = () => {
        if (previewUrl) {
            const resource: PublicResource = {
                type: 'image_url',
                data: {
                    url: previewUrl,
                    mime_type: mimeType,
                    type: mimeType,
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
                <ImageIcon className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Image URL</span>
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
                            placeholder="https://example.com/image.jpg"
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
                        Paste a direct URL to an image file
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
                                Switch to {suggestedType === 'webpage' ? 'Webpage' : suggestedType === 'youtube' ? 'YouTube' : 'File URL'}
                            </Button>
                        )}
                    </div>
                )}

                {/* Image Preview */}
                {previewUrl && (
                    <div className="border border-border rounded-lg overflow-hidden">
                        <div className="relative h-48 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain"
                                onError={() => {
                                    setError('Failed to load image');
                                    setPreviewUrl(null);
                                }}
                            />
                        </div>
                        <div className="p-2 space-y-1 bg-white dark:bg-zinc-900">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">Type:</span>
                                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                    {mimeType}
                                </span>
                            </div>
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                            >
                                <span className="truncate">{previewUrl}</span>
                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </a>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                {!previewUrl && !error && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            <strong>Supported formats:</strong>
                        </p>
                        <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5 ml-3">
                            <li>• .jpg / .jpeg</li>
                            <li>• .png / .gif</li>
                            <li>• .webp / .svg</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Footer with Add Button */}
            {previewUrl && (
                <div className="border-t border-border p-3">
                    <Button onClick={handleSelect} className="w-full" size="sm">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Add Image
                    </Button>
                </div>
            )}
        </div>
    );
}
