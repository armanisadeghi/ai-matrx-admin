"use client";

import React, { useState } from "react";
import { ChevronLeft, Mic, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AudioResourcePickerProps {
    onBack: () => void;
    onSelect: (audioData: AudioData) => void;
}

type AudioData = {
    url: string;
    filename: string;
    type: string;
    transcription?: string;
};

// TODO: This is a placeholder for audio transcription functionality
// Will be implemented with transcription API integration
export function AudioResourcePicker({ onBack, onSelect }: AudioResourcePickerProps) {
    const [url, setUrl] = useState("");

    return (
        <div className="flex flex-col h-[400px]">
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
                <Mic className="w-4 h-4 flex-shrink-0 text-pink-600 dark:text-pink-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Audio Transcription</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Coming Soon Message */}
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-center px-4">
                    <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-950/30 flex items-center justify-center">
                        <Mic className="w-8 h-8 text-pink-600 dark:text-pink-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Audio Transcription Coming Soon
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                            This feature will allow you to transcribe audio files from URLs using advanced transcription APIs.
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg w-full">
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            <strong>Planned features:</strong>
                        </p>
                        <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-0.5 ml-3 text-left">
                            <li>• Audio URL input with validation</li>
                            <li>• Automatic transcription via API</li>
                            <li>• Support for multiple audio formats (mp3, wav, m4a, etc.)</li>
                            <li>• Timestamped transcription output</li>
                            <li>• Speaker diarization (optional)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

