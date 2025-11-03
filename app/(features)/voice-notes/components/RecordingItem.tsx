'use client';

import { useState } from 'react';
import { Recording } from '@/types/audioRecording.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const format = require('format-duration');

interface RecordingItemProps {
    recording: Recording;
    isPlaying: boolean;
    onPlay: () => Promise<void>;
    onPause: () => void;
    onDelete: () => Promise<void>;
}

export function RecordingItem({
    recording,
    isPlaying,
    onPlay,
    onPause,
    onDelete
}: RecordingItemProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handlePlay = async () => {
        setIsLoading(true);
        try {
            await onPlay();
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this recording?')) return;
        
        setIsDeleting(true);
        try {
            await onDelete();
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'default';
            case 'recording':
                return 'destructive';
            case 'paused':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <Card className={cn(
            "transition-all duration-200",
            isPlaying && "ring-2 ring-primary"
        )}>
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    {/* Play/Pause Button */}
                    <Button
                        size="icon"
                        variant={isPlaying ? "default" : "outline"}
                        onClick={isPlaying ? onPause : handlePlay}
                        disabled={isLoading || isDeleting}
                        className="flex-shrink-0"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isPlaying ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                        )}
                    </Button>

                    {/* Recording Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">
                                {recording.title}
                            </h3>
                            <Badge variant={getStatusColor(recording.status)} className="text-xs">
                                {recording.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-mono">
                                {format(recording.duration * 1000)}
                            </span>
                            <span>•</span>
                            <span>{formatSize(recording.size)}</span>
                            <span>•</span>
                            <span>
                                {new Date(recording.created_at).toLocaleDateString()} {new Date(recording.created_at).toLocaleTimeString()}
                            </span>
                        </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

