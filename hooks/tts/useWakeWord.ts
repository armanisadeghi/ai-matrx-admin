// hooks/useWakeWord.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { usePorcupine } from "@picovoice/porcupine-react";

export type WakeWord = {
    publicPath: string;
    label: string;
    displayName: string;
};

export const WAKE_WORDS = {
    HEY_MATRIX: {
        publicPath: "/Hey-Matrix_en_wasm_v3_0_0.ppn",
        label: "hey_matrix",
        displayName: "Hey Matrix"
    },
    WAKE_UP_ASSISTANT: {
        publicPath: "/Wake-Up-Assistant_en_wasm_v3_0_0.ppn",
        label: "wake_up_assistant",
        displayName: "Wake Up Assistant"
    },
    WAKE_UP_MATRIX: {
        publicPath: "/Wake-Up-Matrix_en_wasm_v3_0_0.ppn",
        label: "wake_up_matrix",
        displayName: "Wake Up Matrix"
    }
} as const;

type UseWakeWordProps = {
    wakeWords?: WakeWord[];
    onDetected?: (word: WakeWord) => void;
    autoRestart?: boolean;
    restartDelay?: number;
};

export function useWakeWord({
    wakeWords = Object.values(WAKE_WORDS),
    onDetected,
    autoRestart = true,
    restartDelay = 1000
}: UseWakeWordProps = {}) {
    const [detectedWord, setDetectedWord] = useState<WakeWord | null>(null);
    const lastProcessedDetectionRef = useRef<{ label: string; index: number } | null>(null);

    const {
        keywordDetection,
        isLoaded,
        isListening,
        error,
        init,
        start,
        stop,
        release,
    } = usePorcupine();

    const handleDetection = useCallback(async () => {
        if (!keywordDetection) return;

        // Check if this is the same detection we already processed
        if (lastProcessedDetectionRef.current &&
            lastProcessedDetectionRef.current.label === keywordDetection.label &&
            lastProcessedDetectionRef.current.index === keywordDetection.index) {
            return;
        }

        const detectedWakeWord = wakeWords.find(w => w.label === keywordDetection.label);
        if (!detectedWakeWord) return;

        // Update our last processed detection
        lastProcessedDetectionRef.current = {
            label: keywordDetection.label,
            index: keywordDetection.index
        };

        setDetectedWord(detectedWakeWord);
        onDetected?.(detectedWakeWord);

        await stop();

        setTimeout(async () => {
            setDetectedWord(null);
            // Clear the last processed detection when restarting
            lastProcessedDetectionRef.current = null;
            if (autoRestart) {
                await start();
            }
        }, restartDelay);

    }, [keywordDetection, wakeWords, onDetected, stop, start, autoRestart, restartDelay]);

    // Initialize on mount
    useEffect(() => {
        init(
            process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY!,
            wakeWords,
            { publicPath: "/porcupine_params.pv" }
        );

        return () => {
            release();
        };
    }, []);

    // Handle new detections
    useEffect(() => {
        if (keywordDetection) {
            handleDetection();
        }
    }, [keywordDetection, handleDetection]);

    const startListening = useCallback(async () => {
        setDetectedWord(null);
        await start();
    }, [start]);

    const stopListening = useCallback(async () => {
        setDetectedWord(null);
        await stop();
    }, [stop]);

    const reinitialize = useCallback(async (newWakeWords: WakeWord[]) => {
        await release();
        await init(
            process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY!,
            newWakeWords,
            { publicPath: "/porcupine_params.pv" }
        );
    }, [init, release]);

    return {
        isLoaded,
        isListening,
        error,
        detectedWord,
        start: startListening,
        stop: stopListening,
        reinitialize,
    };
}
