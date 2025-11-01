"use client";

import React, { useState } from "react";
import { ChevronLeft, Youtube, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface YouTubeResourcePickerProps {
    onBack: () => void;
    onSelect: (video: YouTubeVideo) => void;
}

type YouTubeVideo = {
    url: string;
    videoId: string;
    title?: string;
    thumbnail?: string;
    duration?: string;
    channelName?: string;
};

// Extract YouTube video ID from various URL formats
function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

// Validate YouTube URL
function isValidYouTubeUrl(url: string): boolean {
    return extractVideoId(url) !== null;
}

// Get YouTube thumbnail URL
function getThumbnailUrl(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Fetch basic video info using oEmbed API (no API key required)
async function fetchVideoInfo(videoId: string): Promise<{ title?: string; channelName?: string }> {
    try {
        const response = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch video info');
        }

        const data = await response.json();
        return {
            title: data.title,
            channelName: data.author_name
        };
    } catch (error) {
        console.error('Error fetching YouTube video info:', error);
        return {};
    }
}

export function YouTubeResourcePicker({ onBack, onSelect }: YouTubeResourcePickerProps) {
    const [url, setUrl] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [videoPreview, setVideoPreview] = useState<YouTubeVideo | null>(null);

    const handleValidate = async () => {
        setError(null);
        setVideoPreview(null);

        if (!url.trim()) {
            setError("Please enter a YouTube URL");
            return;
        }

        const videoId = extractVideoId(url.trim());

        if (!videoId) {
            setError("Invalid YouTube URL. Please enter a valid YouTube video link.");
            return;
        }

        setIsValidating(true);

        try {
            // Fetch video info
            const info = await fetchVideoInfo(videoId);

            const video: YouTubeVideo = {
                url: `https://www.youtube.com/watch?v=${videoId}`,
                videoId,
                title: info.title || 'YouTube Video',
                thumbnail: getThumbnailUrl(videoId),
                channelName: info.channelName
            };

            setVideoPreview(video);
        } catch (err) {
            setError("Could not fetch video information. The video might be private or unavailable.");
        } finally {
            setIsValidating(false);
        }
    };

    const handleSelect = () => {
        if (videoPreview) {
            onSelect(videoPreview);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isValidating) {
            handleValidate();
        }
    };

    return (
        <div className="flex flex-col h-[400px]">
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
                <Youtube className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">YouTube Video</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        YouTube URL
                    </label>
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 text-xs h-8"
                            disabled={isValidating}
                        />
                        <Button
                            size="sm"
                            onClick={handleValidate}
                            disabled={isValidating || !url.trim()}
                            className="h-8 px-3"
                        >
                            {isValidating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                "Validate"
                            )}
                        </Button>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Paste a YouTube video URL or video ID
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
                {videoPreview && (
                    <div className="space-y-3">
                        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                            {/* Thumbnail */}
                            <div className="relative aspect-video bg-gray-100 dark:bg-gray-900">
                                <img
                                    src={videoPreview.thumbnail}
                                    alt={videoPreview.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center opacity-90">
                                        <Youtube className="w-8 h-8 text-white ml-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3 space-y-1.5 bg-white dark:bg-zinc-900">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                    {videoPreview.title}
                                </h3>
                                {videoPreview.channelName && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {videoPreview.channelName}
                                    </p>
                                )}
                                <a
                                    href={videoPreview.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                    Watch on YouTube
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>

                        {/* Add Button */}
                        <Button
                            onClick={handleSelect}
                            className="w-full"
                            size="sm"
                        >
                            <Youtube className="w-4 h-4 mr-2" />
                            Add Video
                        </Button>
                    </div>
                )}

                {/* Help Text */}
                {!videoPreview && !error && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            <strong>Supported formats:</strong>
                        </p>
                        <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5 ml-3">
                            <li>• youtube.com/watch?v=VIDEO_ID</li>
                            <li>• youtu.be/VIDEO_ID</li>
                            <li>• youtube.com/embed/VIDEO_ID</li>
                            <li>• Direct video ID</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

