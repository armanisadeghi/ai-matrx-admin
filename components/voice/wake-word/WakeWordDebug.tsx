// components/WakeWordDebug.tsx
'use client';

import {useCallback, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useWakeWord, WAKE_WORDS, WakeWord } from "@/hooks/tts/useWakeWord";
import { Label } from "@/components/ui/label";

export function WakeWordDebug() {
    const [activeWakeWords, setActiveWakeWords] = useState<WakeWord[]>([
        WAKE_WORDS.HEY_MATRIX
    ]);
    const [recentDetections, setRecentDetections] = useState<Set<string>>(new Set());

    // Memoize the detection handler to prevent infinite updates
    const handleDetection = useCallback((word: WakeWord) => {
        setRecentDetections(prev => {
            const next = new Set(prev);
            next.add(word.label);
            return next;
        });

        // Schedule removal of detection
        setTimeout(() => {
            setRecentDetections(prev => {
                const next = new Set(prev);
                next.delete(word.label);
                return next;
            });
        }, 1000);

        console.log('Detection:', word.displayName);
    }, []);

    const {
        isLoaded,
        isListening,
        error,
        detectedWord,
        start,
        stop,
        reinitialize
    } = useWakeWord({
        wakeWords: activeWakeWords,
        onDetected: handleDetection
    });

    const toggleWakeWord = useCallback(async (word: WakeWord) => {
        const isCurrentlyActive = activeWakeWords.some(w => w.label === word.label);
        const newActiveWords = isCurrentlyActive
                               ? activeWakeWords.filter(w => w.label !== word.label)
                               : [...activeWakeWords, word];

        if (isListening) await stop();
        setActiveWakeWords(newActiveWords);
        await reinitialize(newActiveWords);
        if (isListening) await start();
    }, [activeWakeWords, isListening, stop, reinitialize, start]);

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Wake Word Detection
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={isListening}
                            onCheckedChange={useCallback(async (checked) => {
                                if (checked) await start();
                                else await stop();
                            }, [start, stop])}
                            disabled={!isLoaded || !!error || activeWakeWords.length === 0}
                        />
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Status indicator */}
                <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full transition-colors ${
                            error ? 'bg-destructive' :
                            !isLoaded ? 'bg-muted animate-pulse' :
                            isListening ? 'bg-primary animate-pulse' :
                            'bg-muted'
                        }`} />
                        <span className="text-sm text-muted-foreground">
                            {error ? 'Error' :
                             !isLoaded ? 'Initializing' :
                             isListening ? 'Listening' :
                             'Ready'}
                        </span>
                    </div>
                </div>

                {error && (
                    <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">
                        {error.toString()}
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Available Wake Words</Label>
                    <div className="grid gap-2">
                        {Object.values(WAKE_WORDS).map((word) => {
                            const isActive = activeWakeWords.some(w => w.label === word.label);
                            const isDetected = recentDetections.has(word.label);

                            return (
                                <div
                                    key={word.label}
                                    className={`p-3 rounded-lg border transition-colors ${
                                        isDetected ? 'bg-primary text-primary-foreground' :
                                        isActive ? 'bg-muted' : 'bg-background'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            {word.displayName}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {isDetected && (
                                                <span className="text-xs animate-pulse">
                                                    Detected!
                                                </span>
                                            )}
                                            <Switch
                                                checked={isActive}
                                                onCheckedChange={() => toggleWakeWord(word)}
                                                disabled={!isLoaded}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-sm text-muted-foreground">
                    {activeWakeWords.length} wake word{activeWakeWords.length !== 1 ? 's' : ''} active
                </div>
            </CardContent>
        </Card>
    );
}
