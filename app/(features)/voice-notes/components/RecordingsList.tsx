'use client';

import { useState } from 'react';
import { Recording } from '@/types/audioRecording.types';
import { RecordingItem } from './RecordingItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Music } from 'lucide-react';

interface RecordingsListProps {
    recordings: Recording[];
    currentPlayingId: number | null;
    onPlay: (id: number) => Promise<void>;
    onPause: () => void;
    onDelete: (id: number) => Promise<void>;
    onRefresh: () => Promise<void>;
    loading?: boolean;
}

export function RecordingsList({
    recordings,
    currentPlayingId,
    onPlay,
    onPause,
    onDelete,
    onRefresh,
    loading = false
}: RecordingsListProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle>Your Recordings</CardTitle>
                        <Badge variant="secondary">
                            {recordings.length}
                        </Badge>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {recordings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Music className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                            No recordings yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Start recording to create your first voice note
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recordings
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((recording) => (
                                <RecordingItem
                                    key={recording.id}
                                    recording={recording}
                                    isPlaying={currentPlayingId === recording.id}
                                    onPlay={() => onPlay(recording.id!)}
                                    onPause={onPause}
                                    onDelete={() => onDelete(recording.id!)}
                                />
                            ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

