"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Youtube, Loader2, AlertCircle, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicResource } from "../../types/content";

interface PublicYouTubePickerProps {
    onBack: () => void;
    onSelect: (resource: PublicResource) => void;
    initialUrl?: string;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeVideoId(url: string): string | null {
    try {
        const urlObj = new URL(url);
        
        // Handle youtu.be format
        if (urlObj.hostname.includes('youtu.be')) {
            return urlObj.pathname.slice(1).split('?')[0];
        }
        
        // Handle youtube.com format
        if (urlObj.hostname.includes('youtube.com')) {
            // Standard watch URL
            const videoId = urlObj.searchParams.get('v');
            if (videoId) return videoId;
            
            // Embed URL
            if (urlObj.pathname.startsWith('/embed/')) {
                return urlObj.pathname.split('/embed/')[1].split('?')[0];
            }
            
            // Shorts URL
            if (urlObj.pathname.startsWith('/shorts/')) {
                return urlObj.pathname.split('/shorts/')[1].split('?')[0];
            }
        }
        
        return null;
    } catch {
        return null;
    }
}

// Validate YouTube URL
function validateYouTubeUrl(url: string): { isValid: boolean; videoId?: string; error?: string } {
    if (!url.trim()) {
        return { isValid: false, error: 'Please enter a YouTube URL' };
    }

    try {
        const urlObj = new URL(url);
        if (!urlObj.protocol.startsWith('http')) {
            return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
        }

        if (!urlObj.hostname.includes('youtube.com') && !urlObj.hostname.includes('youtu.be')) {
            return { isValid: false, error: 'This is not a YouTube URL' };
        }

        const videoId = extractYouTubeVideoId(url);
        if (!videoId) {
            return { isValid: false, error: 'Could not extract video ID from URL' };
        }

        return { isValid: true, videoId };
    } catch {
        return { isValid: false, error: 'Invalid URL format' };
    }
}

export function PublicYouTubePicker({ onBack, onSelect, initialUrl }: PublicYouTubePickerProps) {
    const [url, setUrl] = useState(initialUrl || "");
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [videoInfo, setVideoInfo] = useState<{ url: string; videoId: string } | null>(null);
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
        setVideoInfo(null);
        setIsValidating(true);

        const validation = validateYouTubeUrl(url.trim());

        if (!validation.isValid) {
            setError(validation.error || 'Invalid YouTube URL');
            setIsValidating(false);
            return;
        }

        setVideoInfo({
            url: url.trim(),
            videoId: validation.videoId!,
        });
        setIsValidating(false);
    };

    const handleSelect = () => {
        if (videoInfo) {
            const resource: PublicResource = {
                type: 'youtube',
                data: {
                    url: videoInfo.url,
                    video_id: videoInfo.videoId,
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
                <Youtube className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">YouTube Video</span>
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
                            placeholder="https://www.youtube.com/watch?v=..."
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
                        Paste a YouTube video URL
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                    </div>
                )}

                {/* Video Preview */}
                {videoInfo && (
                    <div className="border border-border rounded-lg overflow-hidden">
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-gray-100 dark:bg-gray-900">
                            <img
                                src={`https://img.youtube.com/vi/${videoInfo.videoId}/mqdefault.jpg`}
                                alt="Video thumbnail"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Info */}
                        <div className="p-3 space-y-2 bg-white dark:bg-zinc-900">
                            <div>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Video ID</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
                                    {videoInfo.videoId}
                                </span>
                            </div>
                            <a
                                href={videoInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                                Open in YouTube
                                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                            </a>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                {!videoInfo && !error && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            <strong>Supported formats:</strong>
                        </p>
                        <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5 ml-3">
                            <li>• youtube.com/watch?v=...</li>
                            <li>• youtu.be/...</li>
                            <li>• youtube.com/shorts/...</li>
                            <li>• youtube.com/embed/...</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Footer with Add Button */}
            {videoInfo && (
                <div className="border-t border-border p-3">
                    <Button onClick={handleSelect} className="w-full" size="sm">
                        <Youtube className="w-4 h-4 mr-2" />
                        Add YouTube Video
                    </Button>
                </div>
            )}
        </div>
    );
}
