'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
    Heart, 
    MessageCircle, 
    Share2, 
    GitFork,
    Bookmark,
    BarChart3,
    Eye
} from 'lucide-react';
import { useCanvasLike } from '@/hooks/canvas/useCanvasLike';
import { useCanvasShare } from '@/hooks/canvas/useCanvasShare';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface CanvasSocialActionsProps {
    canvasId: string;
    shareToken: string;
    likeCount: number;
    commentCount: number;
    viewCount: number;
    shareCount?: number;
    forkCount?: number;
    onCommentClick?: () => void;
    onForkClick?: () => void;
    className?: string;
}

export function CanvasSocialActions({
    canvasId,
    shareToken,
    likeCount,
    commentCount,
    viewCount,
    shareCount = 0,
    forkCount = 0,
    onCommentClick,
    onForkClick,
    className
}: CanvasSocialActionsProps) {
    const { hasLiked, toggleLike, isLoading } = useCanvasLike(canvasId);
    const { copyToClipboard } = useCanvasShare();
    const { toast } = useToast();
    const [showStats, setShowStats] = useState(false);

    const shareUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/canvas/shared/${shareToken}`
        : '';

    const handleShare = async () => {
        const success = await copyToClipboard(shareUrl);
        if (success) {
            toast({
                title: 'Link copied!',
                description: 'Share link copied to clipboard'
            });
        }
    };

    return (
        <div className={cn("flex items-center gap-2 flex-wrap", className)}>
            {/* Like Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={toggleLike}
                disabled={isLoading}
                className={cn(
                    "gap-2 transition-all",
                    hasLiked && "text-red-500 hover:text-red-600"
                )}
            >
                <Heart
                    className={cn(
                        "w-4 h-4 transition-all",
                        hasLiked && "fill-current"
                    )}
                />
                <span className="font-medium">{likeCount}</span>
            </Button>

            {/* Comment Button */}
            {onCommentClick && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCommentClick}
                    className="gap-2"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">{commentCount}</span>
                </Button>
            )}

            {/* Share Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="gap-2"
            >
                <Share2 className="w-4 h-4" />
                <span className="font-medium hidden sm:inline">Share</span>
            </Button>

            {/* Fork Button */}
            {onForkClick && forkCount > 0 && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onForkClick}
                    className="gap-2"
                >
                    <GitFork className="w-4 h-4" />
                    <span className="font-medium">{forkCount}</span>
                </Button>
            )}

            {/* Stats Popover */}
            <Popover open={showStats} onOpenChange={setShowStats}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                    >
                        <BarChart3 className="w-4 h-4" />
                        <span className="font-medium hidden sm:inline">Stats</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                    <div className="space-y-3">
                        <div className="font-semibold text-sm">Engagement Stats</div>
                        
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Eye className="w-4 h-4" />
                                    Views
                                </div>
                                <span className="font-semibold">{viewCount.toLocaleString()}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Heart className="w-4 h-4" />
                                    Likes
                                </div>
                                <span className="font-semibold">{likeCount.toLocaleString()}</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <MessageCircle className="w-4 h-4" />
                                    Comments
                                </div>
                                <span className="font-semibold">{commentCount.toLocaleString()}</span>
                            </div>

                            {shareCount > 0 && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Share2 className="w-4 h-4" />
                                        Shares
                                    </div>
                                    <span className="font-semibold">{shareCount.toLocaleString()}</span>
                                </div>
                            )}

                            {forkCount > 0 && (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <GitFork className="w-4 h-4" />
                                        Remixes
                                    </div>
                                    <span className="font-semibold">{forkCount.toLocaleString()}</span>
                                </div>
                            )}
                        </div>

                        {/* Engagement Rate */}
                        <div className="pt-2 border-t border-border">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Engagement Rate</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {viewCount > 0 
                                        ? `${((likeCount / viewCount) * 100).toFixed(1)}%`
                                        : '0%'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

