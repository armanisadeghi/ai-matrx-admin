'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import {
    ApiName,
    AiCallParams,
    ResponseType,
    AvailableAssistants
} from "@/types/voice/voiceAssistantTypes";
import { getAssistant } from "@/constants/voice-assistants";
import { useDynamicVoiceAiProcessing } from "@/hooks/ai/useDynamicVoiceAiProcessing";
import FastFireFlashcard from './FastFireFlashcard';
import FastFireAnalysis from './FastFireAnalysis';
import { FlashcardData } from '@/types/flashcards.types';

export interface VoiceConfig {
    apiName: ApiName;
    voiceId: string;
    responseType?: ResponseType;
    temperature?: number;
    maxTokens?: number;
}

interface FlashcardResult {
    correct: boolean;
    score: number;
    audioFeedback: string;
    timestamp: number;
}

interface FastFireContainerProps {
    initialFlashcards: FlashcardData[];
    setId: string;
    voiceConfig: VoiceConfig;
    assistantId?: AvailableAssistants;
    aiCallParams?: Partial<AiCallParams>;
}

const FastFireContainer = ({
                               initialFlashcards,
                               setId,
                               voiceConfig,
                               assistantId = "flashcardGrader",
                               aiCallParams = {}
                           }: FastFireContainerProps) => {
    const selectedAssistant = getAssistant(assistantId);
    const [currentCardIndex, setCurrentCardIndex] = useState<number>(-1);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const configRef = useRef({
        aiCallParams: {
            temperature: voiceConfig.temperature ?? 0.5,
            maxTokens: voiceConfig.maxTokens ?? 2000,
            responseFormat: selectedAssistant.responseFormat,
            ...aiCallParams
        },
        apiName: voiceConfig.apiName,
        responseType: voiceConfig.responseType ?? 'text'
    });

    const {
        submit,
        audioPlayer,
        playAllAudioFeedback,
        playCorrectAnswersOnly,
        playHighScoresOnly,
        processState,
        getCurrentConversation,
        createNewConversation,
        setApiName,
        setAiCallParams,
        setResponseType
    } = useDynamicVoiceAiProcessing(selectedAssistant);

    // Initial configuration setup
    useEffect(() => {
        setApiName(configRef.current.apiName);
        setAiCallParams(configRef.current.aiCallParams);
        setResponseType(configRef.current.responseType);
    }, []); // Empty dependency array since we only want this to run once

    // Update config ref if props change
    useEffect(() => {
        configRef.current = {
            aiCallParams: {
                temperature: voiceConfig.temperature ?? 0.5,
                maxTokens: voiceConfig.maxTokens ?? 2000,
                responseFormat: selectedAssistant.responseFormat,
                ...aiCallParams
            },
            apiName: voiceConfig.apiName,
            responseType: voiceConfig.responseType ?? 'text'
        };
    }, [voiceConfig, aiCallParams, selectedAssistant]);

    // Session control handlers
    const handleStart = useCallback(() => {
        setIsActive(true);
        setIsPaused(false);
    }, []);

    const handlePause = useCallback(() => {
        setIsPaused(true);
    }, []);

    const handleResume = useCallback(() => {
        setIsPaused(false);
    }, []);

    const handleStop = useCallback(() => {
        setIsActive(false);
        setIsPaused(false);
        setCurrentCardIndex(-1);
    }, []);

    // Manage current card index based on session state
    useEffect(() => {
        if (isActive && !isPaused) {
            setCurrentCardIndex(prev => prev === -1 ? 0 : prev);
        }
    }, [isActive, isPaused]);

    const currentConversation = getCurrentConversation();
    const results = currentConversation?.structuredData as FlashcardResult[] || [];

    // Initialize conversation if needed
    useEffect(() => {
        if (!currentConversation) {
            createNewConversation();
        }
    }, [currentConversation, createNewConversation]);

    // Handle audio submission and card progression
    const handleAudioComplete = useCallback(async (audioBlob: Blob, flashcardId: string) => {
        if (!isActive || isPaused) return;

        try {
            await submit(audioBlob);

            if (currentCardIndex >= initialFlashcards.length - 1) {
                handleStop();
            } else {
                setCurrentCardIndex(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error processing audio:', error);
            handleStop();
        }
    }, [submit, currentCardIndex, initialFlashcards.length, handleStop, isActive, isPaused]);

    // Review handlers
    const handleReviewSession = useCallback(() => {
        playAllAudioFeedback();
    }, [playAllAudioFeedback]);

    const handleReviewCorrectOnly = useCallback(() => {
        playCorrectAnswersOnly();
    }, [playCorrectAnswersOnly]);

    const handleReviewHighScores = useCallback(() => {
        playHighScoresOnly(4);
    }, [playHighScoresOnly]);

    return (
        <div className="container mx-auto py-8 pb-[160px] space-y-8">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Fast Fire Practice</h1>
                <div className="space-x-4">
                    <Button
                        variant="outline"
                        onClick={handleReviewSession}
                        disabled={results.length === 0 || processState.processing}
                    >
                        <Play className="mr-2 h-4 w-4"/>
                        Review All
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleReviewCorrectOnly}
                        disabled={results.length === 0 || processState.processing}
                    >
                        Review Correct
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleReviewHighScores}
                        disabled={results.length === 0 || processState.processing}
                    >
                        Review Best
                    </Button>
                </div>
            </header>

            <FastFireFlashcard
                initialData={initialFlashcards}
                onComplete={handleAudioComplete}
                defaultTimer={5}
                disabled={processState.processing || !isActive || isPaused}
                isActive={isActive}
                isPaused={isPaused}
                currentCard={currentCardIndex >= 0 ? initialFlashcards[currentCardIndex] : undefined}
            />

            <AnimatePresence mode="wait">
                {audioPlayer && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed bottom-4 right-4"
                    >
                        <Card className="p-4">
                            {audioPlayer}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <FastFireAnalysis
                results={results}
                currentIndex={currentCardIndex}
                totalCards={initialFlashcards.length}
                isProcessing={processState.processing}
                onStart={handleStart}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
                isActive={isActive}
                isPaused={isPaused}
            />
        </div>
    );
};

export default FastFireContainer;
