"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, FileText, Loader2, AlertCircle, ExternalLink, File, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FileUrlResourcePickerProps {
    onBack: () => void;
    onSelect: (fileUrl: FileUrlData) => void;
    onSwitchTo?: (type: 'webpage' | 'youtube' | 'image_url', url: string) => void;
    initialUrl?: string;
}

type FileUrlData = {
    url: string;
    filename: string;
    type: string; // MIME type
    extension: string;
    isValid: boolean;
};

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
        const fileExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json', '.xml', '.zip', '.md'];
        if (fileExtensions.some(ext => pathname.endsWith(ext))) {
            return 'file';
        }
        
        // Default to webpage
        return 'webpage';
    } catch {
        return null;
    }
}

// Validate if URL is accessible and extract file info
async function validateFileUrl(url: string): Promise<{ 
    isValid: boolean; 
    filename?: string; 
    type?: string; 
    extension?: string; 
    error?: string;
    suggestedType?: 'webpage' | 'youtube' | 'image_url';
}> {
    try {
        // Basic URL validation
        const urlObj = new URL(url);
        if (!urlObj.protocol.startsWith('http')) {
            return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
        }

        // Detect URL type
        const detectedType = detectUrlType(url);
        
        if (detectedType === 'youtube') {
            return { 
                isValid: false, 
                error: 'This appears to be a YouTube URL',
                suggestedType: 'youtube'
            };
        }
        
        if (detectedType === 'image') {
            return { 
                isValid: false, 
                error: 'This appears to be an image URL',
                suggestedType: 'image_url'
            };
        }
        
        if (detectedType === 'webpage') {
            return { 
                isValid: false, 
                error: 'This appears to be a webpage. Would you like to scrape it instead?',
                suggestedType: 'webpage'
            };
        }

        // Extract filename from URL
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop() || 'document';
        
        // Extract extension
        const extensionMatch = filename.match(/\.([^.]+)$/);
        const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';

        if (!extension) {
            return { 
                isValid: false, 
                error: 'URL must point to a file with an extension',
                suggestedType: 'webpage'
            };
        }

        // Determine MIME type from extension
        const mimeTypes: Record<string, string> = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'json': 'application/json',
            'xml': 'application/xml',
            'html': 'text/html',
            'zip': 'application/zip',
            'md': 'text/markdown',
        };

        const mimeType = mimeTypes[extension] || 'application/octet-stream';

        return { 
            isValid: true, 
            filename,
            type: mimeType,
            extension
        };
    } catch (error) {
        return { isValid: false, error: 'Invalid URL format' };
    }
}

export function FileUrlResourcePicker({ onBack, onSelect, onSwitchTo, initialUrl }: FileUrlResourcePickerProps) {
    const [url, setUrl] = useState(initialUrl || "");
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestedType, setSuggestedType] = useState<'webpage' | 'youtube' | 'image_url' | null>(null);
    const [previewFile, setPreviewFile] = useState<FileUrlData | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus the input on mount (preventScroll to avoid auto-scroll)
    useEffect(() => {
        inputRef.current?.focus({ preventScroll: true });
    }, []);

    // Auto-validate if initialUrl is provided
    useEffect(() => {
        if (initialUrl && initialUrl.trim()) {
            handleValidate();
        }
    }, [initialUrl]);

    const handleValidate = async () => {
        setError(null);
        setSuggestedType(null);
        setPreviewFile(null);

        if (!url.trim()) {
            setError("Please enter a file URL");
            return;
        }

        setIsValidating(true);

        try {
            const validation = await validateFileUrl(url.trim());

            if (!validation.isValid) {
                setError(validation.error || 'Invalid file URL');
                setSuggestedType(validation.suggestedType || null);
                return;
            }

            const fileData: FileUrlData = {
                url: url.trim(),
                filename: validation.filename || 'document',
                type: validation.type || 'application/octet-stream',
                extension: validation.extension || '',
                isValid: true
            };

            setPreviewFile(fileData);
        } catch (err) {
            setError("Could not validate file URL. Please check the URL and try again.");
        } finally {
            setIsValidating(false);
        }
    };

    const handleSelect = () => {
        if (previewFile) {
            onSelect(previewFile);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isValidating) {
            handleValidate();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        // Get the pasted text from clipboard
        const pastedText = e.clipboardData.getData('text');
        
        // Update the state immediately
        setUrl(pastedText);
        
        // Auto-validate after state has been set
        setTimeout(() => {
            handleValidate();
        }, 150);
    };

    return (
        <div className="flex flex-col h-[450px]">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={onBack}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <FileText className="w-4 h-4 flex-shrink-0 text-purple-600 dark:text-purple-500" />
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
                            onKeyPress={handleKeyPress}
                            onPaste={handlePaste}
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
                                className="w-full text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => onSwitchTo(suggestedType, url)}
                            >
                                <Globe className="w-3.5 h-3.5 mr-1.5" />
                                Switch to {suggestedType === 'webpage' ? 'Webpage' : suggestedType === 'youtube' ? 'YouTube' : 'Image URL'}
                            </Button>
                        )}
                    </div>
                )}

                {/* File Preview */}
                {previewFile && (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                        {/* File Icon/Info */}
                        <div className="p-4 bg-gray-50 dark:bg-zinc-900 flex items-center gap-3">
                            <div className="w-12 h-12 rounded bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0">
                                <File className="w-6 h-6 text-purple-600 dark:text-purple-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {previewFile.filename}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <span className="uppercase">{previewFile.extension}</span>
                                    <span>•</span>
                                    <span className="truncate">{previewFile.type}</span>
                                </div>
                            </div>
                        </div>

                        {/* URL */}
                        <div className="p-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900">
                            <a
                                href={previewFile.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                <span className="truncate">{previewFile.url}</span>
                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </a>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                {!previewFile && !error && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            <strong>Supported formats:</strong>
                        </p>
                        <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5 ml-3">
                            <li>• PDF (.pdf)</li>
                            <li>• Documents (.doc, .docx, .txt)</li>
                            <li>• Spreadsheets (.xls, .xlsx, .csv)</li>
                            <li>• Presentations (.ppt, .pptx)</li>
                            <li>• Data files (.json, .xml, .csv)</li>
                            <li>• Archives (.zip)</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Footer with Add Button */}
            {previewFile && (
                <div className="border-t border-gray-200 dark:border-gray-800 p-3">
                    <Button
                        onClick={handleSelect}
                        className="w-full"
                        size="sm"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Add File
                    </Button>
                </div>
            )}
        </div>
    );
}
