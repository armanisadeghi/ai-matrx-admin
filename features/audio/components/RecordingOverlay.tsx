"use client";

import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RecordingOverlayProps {
    duration: number;
    audioLevel?: number;
    onStop: () => void;
}

export function RecordingOverlay({ duration, audioLevel = 0, onStop }: RecordingOverlayProps) {
    // Format duration as MM:SS
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50" />

            {/* Recording Overlay - Centered */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-background/95 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl p-8 flex flex-col items-center gap-6 max-w-xs w-full">
                    {/* Animated Microphone */}
                    <div className="relative">
                        {/* Pulsing rings */}
                        <div className="absolute inset-0 -m-4">
                            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                            <div className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" />
                        </div>
                        
                        {/* Mic icon */}
                        <div className={cn(
                            "relative p-6 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg",
                            "transition-transform duration-200",
                            audioLevel > 0.5 && "scale-110"
                        )}>
                            <Mic className="h-10 w-10 text-white" />
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="text-center">
                        <div className="text-3xl font-bold text-foreground tabular-nums">
                            {formatDuration(duration)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                            Recording...
                        </div>
                    </div>

                    {/* Stop Button */}
                    <Button
                        onClick={onStop}
                        variant="outline"
                        className="w-full h-12 text-base font-semibold"
                        style={{ fontSize: '16px' }}
                    >
                        Stop Recording
                    </Button>
                </div>
            </div>
        </>
    );
}

