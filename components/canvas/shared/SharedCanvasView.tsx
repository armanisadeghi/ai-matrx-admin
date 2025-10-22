'use client';

import React, { useEffect } from 'react';
import { useSharedCanvas } from '@/hooks/canvas/useSharedCanvas';
import { CanvasSocialActions } from '../social/CanvasSocialActions';
import { CanvasRenderer } from '@/components/layout/adaptive-layout/CanvasRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
    User, 
    Calendar, 
    Eye, 
    Heart, 
    MessageCircle,
    Trophy,
    GitFork,
    ExternalLink,
    Loader2
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { CanvasLeaderboard } from '../leaderboard/CanvasLeaderboard';
import { cn } from '@/lib/utils';

interface SharedCanvasViewProps {
    shareToken: string;
}

export function SharedCanvasView({ shareToken }: SharedCanvasViewProps) {
    const { data: canvas, isLoading, error } = useSharedCanvas(shareToken);

    // Update page title and meta tags
    useEffect(() => {
        if (canvas) {
            document.title = `${canvas.title} - AI Matrix Canvas`;
            
            // Add Open Graph meta tags for social sharing
            const addMetaTag = (property: string, content: string) => {
                let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.setAttribute('property', property);
                    document.head.appendChild(meta);
                }
                meta.content = content;
            };

            addMetaTag('og:title', canvas.title);
            if (canvas.description) {
                addMetaTag('og:description', canvas.description);
            }
            addMetaTag('og:type', 'website');
            addMetaTag('og:url', window.location.href);
        }
    }, [canvas]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
                    <p className="text-gray-600 dark:text-gray-400">Loading canvas...</p>
                </div>
            </div>
        );
    }

    if (error || !canvas) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Canvas Not Found</CardTitle>
                        <CardDescription>
                            This canvas doesn't exist or has been made private.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/">Go Home</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getInitials = (name: string | null) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Header Bar */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <div className="flex items-center justify-between">
                        <Link 
                            href="/"
                            className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all"
                        >
                            AI Matrix
                        </Link>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="capitalize">
                                {canvas.canvas_type.replace('-', ' ')}
                            </Badge>
                            {canvas.has_scoring && (
                                <Badge variant="secondary">
                                    <Trophy className="w-3 h-3 mr-1" />
                                    Scored
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Title & Description */}
                <div className="mb-6 space-y-3">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        {canvas.title}
                    </h1>
                    {canvas.description && (
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            {canvas.description}
                        </p>
                    )}
                    
                    {/* Tags */}
                    {canvas.tags && canvas.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {canvas.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                    #{tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Social Actions */}
                <div className="mb-6">
                    <CanvasSocialActions
                        canvasId={canvas.id}
                        shareToken={canvas.share_token}
                        likeCount={canvas.like_count}
                        commentCount={canvas.comment_count}
                        viewCount={canvas.view_count}
                        shareCount={canvas.share_count}
                        forkCount={canvas.fork_count}
                        className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Canvas */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="overflow-hidden">
                            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6">
                                <CanvasRenderer content={canvas.canvas_data} />
                            </div>
                        </Card>

                        {/* Leaderboard (if scored) */}
                        {canvas.has_scoring && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        Leaderboard
                                    </CardTitle>
                                    <CardDescription>
                                        Top scores from all players
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CanvasLeaderboard canvasId={canvas.id} />
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Creator Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Created By</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 mb-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                            {getInitials(canvas.creator_display_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                                            {canvas.creator_display_name || 'Anonymous'}
                                        </div>
                                        {canvas.creator_username && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                @{canvas.creator_username}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            {formatDistanceToNow(new Date(canvas.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>

                                {canvas.creator_username && (
                                    <Button asChild variant="outline" className="w-full mt-4">
                                        <Link href={`/canvas/creator/${canvas.creator_username}`}>
                                            <User className="w-4 h-4 mr-2" />
                                            View Profile
                                        </Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Stats Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Statistics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Eye className="w-4 h-4" />
                                        Views
                                    </div>
                                    <span className="font-semibold">{canvas.view_count.toLocaleString()}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Heart className="w-4 h-4" />
                                        Likes
                                    </div>
                                    <span className="font-semibold">{canvas.like_count.toLocaleString()}</span>
                                </div>

                                {canvas.has_scoring && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <Trophy className="w-4 h-4" />
                                                High Score
                                            </div>
                                            <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                                                {canvas.high_score || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Total Attempts
                                            </div>
                                            <span className="font-semibold">{canvas.total_attempts}</span>
                                        </div>
                                    </>
                                )}

                                {canvas.fork_count > 0 && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <GitFork className="w-4 h-4" />
                                                Remixes
                                            </div>
                                            <span className="font-semibold">{canvas.fork_count}</span>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Remix Button */}
                        {canvas.allow_remixes && (
                            <Button className="w-full" variant="outline">
                                <GitFork className="w-4 h-4 mr-2" />
                                Remix This Canvas
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

