'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, Pause, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecordingControlsProps {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    formattedDuration: string;
    loading: boolean;
    error: string | null;
    onStart: () => Promise<void>;
    onStop: () => Promise<void>;
    onPause: () => void;
    onResume: () => void;
}

export function RecordingControls({
    isRecording,
    isPaused,
    duration,
    formattedDuration,
    loading,
    error,
    onStart,
    onStop,
    onPause,
    onResume
}: RecordingControlsProps) {
    return (
        <Card className="border-2">
            <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                    {/* Status Display */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isRecording && !isPaused && (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                                        <div className="relative w-3 h-3 bg-red-500 rounded-full" />
                                    </div>
                                    <Badge variant="destructive" className="text-sm">
                                        Recording
                                    </Badge>
                                </div>
                            )}
                            {isPaused && (
                                <Badge variant="secondary" className="text-sm">
                                    Paused
                                </Badge>
                            )}
                            {!isRecording && !isPaused && (
                                <Badge variant="outline" className="text-sm">
                                    Ready
                                </Badge>
                            )}
                        </div>

                        {/* Duration Display */}
                        <div className="text-2xl font-mono font-semibold text-primary">
                            {formattedDuration}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Control Buttons */}
                    <div className="flex items-center justify-center gap-3">
                        {!isRecording ? (
                            <Button
                                size="lg"
                                onClick={onStart}
                                disabled={loading}
                                className="gap-2 h-12 px-8"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-5 h-5" />
                                        Start Recording
                                    </>
                                )}
                            </Button>
                        ) : (
                            <>
                                {isPaused ? (
                                    <Button
                                        size="lg"
                                        variant="secondary"
                                        onClick={onResume}
                                        disabled={loading}
                                        className="gap-2 h-12 px-6"
                                    >
                                        <Play className="w-5 h-5" />
                                        Resume
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        variant="secondary"
                                        onClick={onPause}
                                        disabled={loading}
                                        className="gap-2 h-12 px-6"
                                    >
                                        <Pause className="w-5 h-5" />
                                        Pause
                                    </Button>
                                )}

                                <Button
                                    size="lg"
                                    variant="destructive"
                                    onClick={onStop}
                                    disabled={loading}
                                    className="gap-2 h-12 px-6"
                                >
                                    <Square className="w-4 h-4 fill-current" />
                                    Stop
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

