// components/audio/AudioModal.tsx
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Credenza,
    CredenzaContent,
    CredenzaHeader,
    CredenzaTitle,
    CredenzaDescription,
    CredenzaBody,
} from "@/components/ui/credenza-modal/credenza";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Headphones } from 'lucide-react';
import TextToSpeechPlayer from '@/components/audio/TextToSpeechPlayer';
import { motion } from 'motion/react';
import { useWindowSize } from "@uidotdev/usehooks";
import { cn } from "@/lib/utils";
import type { AudioPlaybackState } from '@/types/audio';

interface AudioModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    hideText?: boolean;
    className?: string;
}

const AudioModal: React.FC<AudioModalProps> = ({
                                                   isOpen,
                                                   onClose,
                                                   text,
                                                   icon = <Headphones className="h-6 w-6 sm:h-8 sm:w-8"/>,
                                                   title = "Audio Explanation",
                                                   description = "Listen to the audio explanation.",
                                                   hideText = false,
                                                   className,
                                               }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [forceStop, setForceStop] = useState(false);
    const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
        isPlaying: false,
        isPaused: false,
        isComplete: false,
        status: 'idle'
    });

    const textAnimationRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const textIndexRef = useRef(0);
    const textSpeedRef = useRef(50); // ms between characters
    const cleanupRef = useRef(false);
    const { width } = useWindowSize();
    const isMobile = width ? width < 640 : false;

    const cleanup = useCallback(() => {
        cleanupRef.current = true;
        setForceStop(true);
        clearTextAnimation();
        resetTextAnimation();
        setPlaybackState({
            isPlaying: false,
            isPaused: false,
            isComplete: true,
            status: 'stopped'
        });
    }, []);

    const clearTextAnimation = useCallback(() => {
        if (textAnimationRef.current) {
            clearInterval(textAnimationRef.current);
            textAnimationRef.current = undefined;
        }
    }, []);

    const startTextAnimation = useCallback(() => {
        if (cleanupRef.current) return;

        clearTextAnimation();
        textIndexRef.current = 0;
        setDisplayedText('');
        setIsAnimating(true);

        textAnimationRef.current = setInterval(() => {
            if (cleanupRef.current) {
                clearTextAnimation();
                return;
            }

            if (textIndexRef.current < text.length) {
                setDisplayedText(prev => prev + text[textIndexRef.current]);
                textIndexRef.current++;
            } else {
                clearTextAnimation();
                setIsAnimating(false);
            }
        }, textSpeedRef.current);
    }, [text, clearTextAnimation]);

    const pauseTextAnimation = useCallback(() => {
        if (cleanupRef.current) return;
        clearTextAnimation();
        setIsAnimating(false);
    }, [clearTextAnimation]);

    const resumeTextAnimation = useCallback(() => {
        if (cleanupRef.current || textIndexRef.current >= text.length) return;

        setIsAnimating(true);
        textAnimationRef.current = setInterval(() => {
            if (cleanupRef.current) {
                clearTextAnimation();
                return;
            }

            if (textIndexRef.current < text.length) {
                setDisplayedText(prev => prev + text[textIndexRef.current]);
                textIndexRef.current++;
            } else {
                clearTextAnimation();
                setIsAnimating(false);
            }
        }, textSpeedRef.current);
    }, [text, clearTextAnimation]);

    const resetTextAnimation = useCallback(() => {
        clearTextAnimation();
        textIndexRef.current = 0;
        setDisplayedText('');
        setIsAnimating(false);
    }, [clearTextAnimation]);

    const handlePlaybackStateChange = useCallback((newState: Partial<AudioPlaybackState>) => {
        if (cleanupRef.current) return;

        setPlaybackState(prev => ({ ...prev, ...newState }));

        if (newState.isPlaying && !newState.isPaused) {
            if (newState.status === 'Starting') {
                resetTextAnimation();
                startTextAnimation();
            } else {
                resumeTextAnimation();
            }
        } else if (newState.isPaused) {
            pauseTextAnimation();
        } else if (newState.status === 'Stopped' || newState.isComplete) {
            resetTextAnimation();
        }
    }, [startTextAnimation, pauseTextAnimation, resumeTextAnimation, resetTextAnimation]);

    // Handle modal close
    const handleModalClose = useCallback(() => {
        cleanup();
        onClose();
    }, [cleanup, onClose]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            cleanupRef.current = false;
            setForceStop(false);
            resetTextAnimation();
            setPlaybackState({
                isPlaying: false,
                isPaused: false,
                isComplete: false,
                status: 'idle'
            });
        } else {
            cleanup();
        }

        return () => {
            cleanup();
        };
    }, [isOpen, resetTextAnimation, cleanup]);

    // Handle unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    }, [cleanup]);

    return (
        <Credenza
            open={isOpen}
            onOpenChange={handleModalClose}
        >
            <CredenzaContent
                className={cn(
                    "sm:max-w-[800px] max-h-[90vh] w-[95vw] sm:w-[90vw]",
                    className
                )}
            >
                <CredenzaHeader>
                    <CredenzaTitle className="text-xl sm:text-3xl font-bold flex items-center gap-2">
                        {icon}
                        {title}
                    </CredenzaTitle>
                    <CredenzaDescription className="text-base sm:text-lg text-muted-foreground">
                        {description}
                    </CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody className="mt-4 sm:mt-6 flex flex-col gap-4">
                    {!hideText && (
                        <ScrollArea className="flex-grow h-[30vh] sm:h-[40vh] w-full rounded-md border p-4">
                            <motion.div
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 1 }}
                                className="text-base sm:text-lg leading-relaxed"
                            >
                                {displayedText}
                            </motion.div>
                        </ScrollArea>
                    )}
                    <div className={cn(
                        "w-full",
                        hideText ? "mt-0" : "mt-4 sm:mt-6"
                    )}>
                        <TextToSpeechPlayer
                            text={text}
                            autoPlay={true}
                            onPlaybackStateChange={handlePlaybackStateChange}
                            playbackState={playbackState}
                            forceStop={forceStop}
                        />
                    </div>
                </CredenzaBody>
            </CredenzaContent>
        </Credenza>
    );
};

export default AudioModal;
