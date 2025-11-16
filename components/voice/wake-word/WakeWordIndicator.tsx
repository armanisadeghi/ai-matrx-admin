// components/WakeWordIndicator.tsx
'use client';

import {motion, AnimatePresence} from "motion/react";
import {Mic} from "lucide-react";
import {useWakeWord, WakeWord} from "@/hooks/tts/useWakeWord";

type WakeWordIndicatorProps = {
    wakeWords?: WakeWord[];
    onDetected?: (word: WakeWord) => void;
    minimal?: boolean;
};

export function WakeWordIndicator(
    {
        wakeWords,
        onDetected,
        minimal = false
    }: WakeWordIndicatorProps) {
    const {
        isLoaded,
        isListening,
        detectedWord,
        error
    } = useWakeWord({
        wakeWords,
        onDetected
    });

    if (minimal) {
        return (
            <div className="inline-flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                    error ? 'bg-destructive' :
                    !isLoaded ? 'bg-muted animate-pulse' :
                    isListening ? 'bg-primary animate-pulse' :
                    'bg-muted'
                }`}/>
                {detectedWord && (
                    <motion.span
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        className="text-xs text-muted-foreground"
                    >
                        Detected: {detectedWord.displayName}
                    </motion.span>
                )}
            </div>
        );
    }

    return (
        <div className="p-2 rounded-lg border bg-background">
            <div className="flex items-center gap-2">
                <Mic className={`w-4 h-4 ${
                    isListening ? 'text-primary' : 'text-muted-foreground'
                }`}/>
                <span className="text-sm">
                    {error ? 'Error initializing' :
                     !isLoaded ? 'Initializing...' :
                     isListening ? 'Listening for wake word' :
                     'Wake word detection paused'}
                </span>
            </div>
            <AnimatePresence>
                {detectedWord && (
                    <motion.div
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: 'auto'}}
                        exit={{opacity: 0, height: 0}}
                        className="mt-2 p-2 bg-primary/10 rounded text-sm text-primary"
                    >
                        Detected: {detectedWord.displayName}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
