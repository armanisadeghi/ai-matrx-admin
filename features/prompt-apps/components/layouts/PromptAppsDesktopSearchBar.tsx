"use client";

import { useState, useCallback } from "react";
import { Search, Mic, SlidersHorizontal, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecordAndTranscribe } from "@/features/audio/hooks";
import { TranscriptionResult } from "@/features/audio/types";
import { RecordingOverlay } from "@/features/audio/components/RecordingOverlay";
import { TranscriptionLoader } from "@/features/audio/components/TranscriptionLoader";

interface PromptAppsDesktopSearchBarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    onFilterClick: () => void;
    onNewClick: () => void;
    showFilterBadge?: boolean;
}

export function PromptAppsDesktopSearchBar({
    searchValue,
    onSearchChange,
    onFilterClick,
    onNewClick,
    showFilterBadge = false,
}: PromptAppsDesktopSearchBarProps) {
    const [localSearchValue, setLocalSearchValue] = useState(searchValue);

    const handleTranscriptionComplete = useCallback(
        (result: TranscriptionResult) => {
            if (result.success && result.text) {
                setLocalSearchValue(result.text);
                onSearchChange(result.text);
            }
        },
        [onSearchChange]
    );

    const {
        isRecording,
        isPaused,
        isTranscribing,
        duration,
        audioLevel,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        reset,
    } = useRecordAndTranscribe({
        onTranscriptionComplete: handleTranscriptionComplete,
        onError: (error) => console.error("Voice input error:", error),
        autoTranscribe: true,
    });

    const handleSearchChange = (value: string) => {
        setLocalSearchValue(value);
        onSearchChange(value);
    };

    const handleMicClick = async () => {
        if (!isRecording && !isTranscribing) {
            await startRecording();
        }
    };

    if (isRecording) {
        return (
            <RecordingOverlay
                duration={duration}
                audioLevel={audioLevel}
                isPaused={isPaused}
                onStop={stopRecording}
                onPause={pauseRecording}
                onResume={resumeRecording}
                onCancel={reset}
            />
        );
    }

    if (isTranscribing) {
        return (
            <>
                <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50" />
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-background/95 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl p-8 flex flex-col items-center gap-4">
                        <TranscriptionLoader duration={duration} size="lg" />
                        <div className="text-sm text-muted-foreground">
                            Transcribing...
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="mb-8">
            <div className="flex items-center gap-3">
                {/* Search Container */}
                <div className="flex-1 relative">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl transition-shadow">
                        <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <input
                            type="text"
                            value={localSearchValue}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search apps..."
                            className="flex-1 bg-transparent border-0 outline-none text-base text-foreground placeholder:text-muted-foreground"
                        />
                        {localSearchValue && (
                            <button
                                onClick={() => handleSearchChange("")}
                                className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors flex-shrink-0"
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                        )}
                        <button
                            onClick={handleMicClick}
                            className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors flex-shrink-0"
                        >
                            <Mic className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Filter Button */}
                <Button
                    variant="outline"
                    size="lg"
                    onClick={onFilterClick}
                    className="h-[52px] px-5 rounded-2xl border-border/50 shadow-lg hover:shadow-xl backdrop-blur-xl bg-background/80 relative"
                >
                    <SlidersHorizontal className="h-5 w-5 mr-2" />
                    Filter
                    {showFilterBadge && (
                        <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />
                    )}
                </Button>

                {/* New Button */}
                <Button
                    size="lg"
                    onClick={onNewClick}
                    className="h-[52px] px-5 rounded-2xl shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    New App
                </Button>
            </div>
        </div>
    );
}
