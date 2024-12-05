// components/WakeWordDebug.tsx
'use client';

// components/WakeWordDebug.tsx
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useWakeWord, WAKE_WORDS, WakeWord } from "@/hooks/tts/useWakeWord";
import { Label } from "@/components/ui/label";

export function WakeWordDebug() {
    const [activeWakeWords, setActiveWakeWords] = useState<WakeWord[]>([
        WAKE_WORDS.HEY_MATRIX
    ]);

    const {
        isLoaded,
        isListening,
        error,
        detectedWord, // This will only be non-null for 1 second after a real detection
        start,
        stop,
        reinitialize
    } = useWakeWord({
        wakeWords: activeWakeWords,
        onDetected: console.log // Just for debugging
    });

    // Toggle individual wake words
    const toggleWakeWord = async (word: WakeWord) => {
        const isCurrentlyActive = activeWakeWords.some(w => w.label === word.label);
        const newActiveWords = isCurrentlyActive
                               ? activeWakeWords.filter(w => w.label !== word.label)
                               : [...activeWakeWords, word];

        if (isListening) await stop();
        setActiveWakeWords(newActiveWords);
        await reinitialize(newActiveWords);
        if (isListening) await start();
    };

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    Wake Word Detection
                    <Switch
                        checked={isListening}
                        onCheckedChange={(checked) => checked ? start() : stop()}
                        disabled={!isLoaded || !!error || activeWakeWords.length === 0}
                    />
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Status Section */}
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

                {/* Error Display */}
                {error && (
                    <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">
                        {error.toString()}
                    </div>
                )}

                {/* Wake Words Section */}
                <div className="space-y-2">
                    <Label>Available Wake Words</Label>
                    <div className="grid gap-2">
                        {Object.values(WAKE_WORDS).map((word) => {
                            const isActive = activeWakeWords.some(w => w.label === word.label);
                            const isCurrentlyDetected = detectedWord?.label === word.label;

                            return (
                                <div
                                    key={word.label}
                                    className={`p-3 rounded-lg border transition-colors ${
                                        isCurrentlyDetected ? 'bg-primary text-primary-foreground' :
                                        isActive ? 'bg-muted' : 'bg-background'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            {word.displayName}
                                        </span>
                                        <Switch
                                            checked={isActive}
                                            onCheckedChange={() => toggleWakeWord(word)}
                                        />
                                        {isCurrentlyDetected && <span>Detected!</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Active Wake Words Count */}
                <div className="text-sm text-muted-foreground">
                    {activeWakeWords.length} wake word{activeWakeWords.length !== 1 ? 's' : ''} active
                </div>
            </CardContent>
        </Card>
    );
}
