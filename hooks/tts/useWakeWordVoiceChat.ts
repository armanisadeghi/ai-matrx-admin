'use client';

import {useState, useEffect, useCallback, useRef} from "react";
import {useVoiceChatWithAutoSleep} from "./useVoiceChatWithAutoSleep";
import {useWakeWord, WakeWord, WAKE_WORDS} from "./useWakeWord";
import {toast} from "sonner";

// Operational modes for the system
export enum OperationalMode {
    OFF = "OFF",
    WAKE_WORD_DETECTION = "WAKE_WORD_DETECTION",
    ACTIVE_PROCESSING = "ACTIVE_PROCESSING"
}

interface WakeWordVoiceChatConfig {
    // Auto sleep configuration
    initialAutoSleepConfig?: {
        enabled: boolean;
        timeout: number;
    };
    // Wake word configuration
    wakeWords?: WakeWord[];
    autoRestartWakeWord?: boolean;
    wakeWordRestartDelay?: number;
    // Initial operational mode
    initialMode?: OperationalMode;
}

export const useWakeWordVoiceChat = (
    {
        initialAutoSleepConfig,
        wakeWords = [WAKE_WORDS.HEY_MATRIX],
        autoRestartWakeWord = true,
        wakeWordRestartDelay = 1000,
        initialMode = OperationalMode.ACTIVE_PROCESSING
    }: WakeWordVoiceChatConfig = {}) => {
    // Initialize both underlying hooks
    const voiceChat = useVoiceChatWithAutoSleep(initialAutoSleepConfig);
    const [operationalMode, setOperationalMode] = useState<OperationalMode>(initialMode);

    // Initialize wake word detection with callback
    const wakeWord = useWakeWord({
        wakeWords,
        autoRestart: autoRestartWakeWord,
        restartDelay: wakeWordRestartDelay,
        onDetected: handleWakeWordDetection
    });

    // Track initialization state
    const [isInitialized, setIsInitialized] = useState(false);

    // Callback for wake word detection
    function handleWakeWordDetection(detectedWord: WakeWord) {
        if (operationalMode === OperationalMode.WAKE_WORD_DETECTION) {
            setOperationalMode(OperationalMode.ACTIVE_PROCESSING);
            voiceChat.wakeUp();
        }
    }

// Handle mode transitions
    useEffect(() => {
        const handleModeTransition = async () => {
            try {
                switch (operationalMode) {
                    case OperationalMode.OFF:
                        await wakeWord.stop();
                        if (!voiceChat.isAsleep) {
                            voiceChat.updateAutoSleepConfig({enabled: true, timeout: 0});
                        }
                        break;

                    case OperationalMode.WAKE_WORD_DETECTION:
                        if (voiceChat.isAsleep) {
                            await wakeWord.start();
                        } else {
                            // Wait for voice chat to finish current processing
                            const isProcessing = Object.values(voiceChat.processState).some(Boolean);
                            if (!isProcessing) {
                                await wakeWord.start();
                            }
                        }
                        break;

                    case OperationalMode.ACTIVE_PROCESSING:
                        await wakeWord.stop();
                        if (voiceChat.isAsleep) {
                            voiceChat.wakeUp();
                        }
                        break;
                }
                setIsInitialized(true);
            } catch (error) {
                console.error('Mode transition error:', error);
                toast.error("Failed to transition operational mode");
            }
        };

        handleModeTransition();
    }, [operationalMode]);

    // Handle voice chat sleep state changes
    useEffect(() => {
        if (isInitialized && voiceChat.isAsleep && operationalMode === OperationalMode.ACTIVE_PROCESSING) {
            setOperationalMode(OperationalMode.WAKE_WORD_DETECTION);
        }
    }, [voiceChat.isAsleep, isInitialized, operationalMode]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wakeWord.stop();
            setOperationalMode(OperationalMode.OFF);
        };
    }, []);

    const setMode = useCallback(async (newMode: OperationalMode) => {
        setOperationalMode(newMode);
    }, []);

    // Enhanced resetSleepTimer that considers operational mode
    const resetSleepTimer = useCallback(() => {
        if (operationalMode === OperationalMode.ACTIVE_PROCESSING) {
            voiceChat.resetSleepTimer();
        }
    }, [operationalMode, voiceChat.resetSleepTimer]);

// Combine status information
    const status = {
        operationalMode,
        isInitialized,
        isProcessingAudio: Object.values(voiceChat.processState).some(Boolean),
        isListeningForWakeWord: operationalMode === OperationalMode.WAKE_WORD_DETECTION && wakeWord.isListening,
        isAsleep: voiceChat.isAsleep,
        lastDetectedWakeWord: wakeWord.detectedWord,
        error: voiceChat.vad.errored || wakeWord.error
    };

    return {
        // System control
        status,
        setMode,
        resetSleepTimer,

        // Wake word configuration
        wakeWord: {
            isLoaded: wakeWord.isLoaded,
            isListening: wakeWord.isListening,
            detectedWord: wakeWord.detectedWord,
            reinitialize: wakeWord.reinitialize
        },

        // Voice chat functionality (extending all non-conflicting features)
        input: voiceChat.input,
        setInput: voiceChat.setInput,
        conversations: voiceChat.conversations,
        currentConversationId: voiceChat.currentConversationId,
        currentTranscript: voiceChat.currentTranscript,
        processState: voiceChat.processState,
        activityTiming: voiceChat.activityTiming,
        createNewConversation: voiceChat.createNewConversation,
        deleteConversation: voiceChat.deleteConversation,
        setCurrentConversationId: voiceChat.setCurrentConversationId,
        handleSubmit: voiceChat.handleSubmit,
        getCurrentConversation: voiceChat.getCurrentConversation,
        selectedAssistant: voiceChat.selectedAssistant,
        setSelectedAssistant: voiceChat.setSelectedAssistant,

        // Configuration
        autoSleepConfig: voiceChat.autoSleepConfig,
        updateAutoSleepConfig: voiceChat.updateAutoSleepConfig,
        NEVER_SLEEP_TIMEOUT: voiceChat.NEVER_SLEEP_TIMEOUT
    };
};
