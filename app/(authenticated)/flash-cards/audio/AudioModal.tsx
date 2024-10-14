'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Credenza,
    CredenzaContent,
    CredenzaHeader,
    CredenzaTitle,
    CredenzaDescription,
    CredenzaBody,
} from "@/components/ui/added-ui/credenza-modal/credenza";
import { Beaker, Play, Pause, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { VoiceSpeed, EmotionName, EmotionLevel, VoiceOptions } from '@/lib/cartesia/cartesia.types';
import { useCartesia } from "@/hooks/tts/useCartesia";

interface AudioModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
}

const AudioModal: React.FC<AudioModalProps> = ({ isOpen, onClose, text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTextComplete, setIsTextComplete] = useState(false);
    const [startTextAnimation, setStartTextAnimation] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackStatus, setPlaybackStatus] = useState('Stopped');

    const {
        sendMessage,
        messages,
        isConnected,
        error,
        pausePlayback,
        resumePlayback,
        togglePlayback,
        stopPlayback
    } = useCartesia();

    const voice: VoiceOptions = {
        mode: "id",
        id: "42b39f37-515f-4eee-8546-73e841679c1d",
    };

    const speed = VoiceSpeed.NORMAL;
    const emotions = [
        { emotion: EmotionName.POSITIVITY, intensity: EmotionLevel.HIGHEST },
        { emotion: EmotionName.CURIOSITY }
    ];

    useEffect(() => {
        if (isOpen && isConnected) {
            setDisplayedText('');
            sendMessage(text, speed, voice, emotions)
                .catch(err => console.error('Failed to send message:', err));
            setIsTextComplete(false);
            setStartTextAnimation(false);

            const delayTimer = setTimeout(() => {
                setStartTextAnimation(true);
            }, 1000);

            return () => clearTimeout(delayTimer);
        }
    }, [isOpen, isConnected, sendMessage, text, speed, voice, emotions]);

    useEffect(() => {
        if (startTextAnimation) {
            let index = 0;
            const intervalId = setInterval(() => {
                if (index < text.length) {
                    setDisplayedText((prev) => prev + text[index]);
                    index++;
                } else {
                    clearInterval(intervalId);
                    setIsTextComplete(true);
                }
            }, 50);
            return () => clearInterval(intervalId);
        }
    }, [startTextAnimation, text]);

    const handlePlayPause = useCallback(async () => {
        if (isPlaying) {
            await pausePlayback();
            setPlaybackStatus('Paused');
        } else {
            await resumePlayback();
            setPlaybackStatus('Playing');
        }
        setIsPlaying((prev) => !prev);
    }, [isPlaying, pausePlayback, resumePlayback]);

    const handleTogglePlayback = useCallback(async () => {
        await togglePlayback();
        setIsPlaying(false);
        setPlaybackStatus('Toggled');
    }, [togglePlayback]);

    return (
        <Credenza open={isOpen} onOpenChange={onClose}>
            <CredenzaContent className="sm:max-w-[800px] max-h-[80vh]">
                <CredenzaHeader>
                    <CredenzaTitle className="text-3xl font-bold flex items-center">
                        <Beaker className="mr-2 h-8 w-8" />
                        Chemistry Explanation
                    </CredenzaTitle>
                    <CredenzaDescription className="text-lg">
                        Listen to the audio explanation of the concept.
                    </CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody className="mt-6">
                    <div className="space-y-4">
                        <AnimatePresence>
                            {startTextAnimation && displayedText && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-lg leading-relaxed"
                                >
                                    {displayedText}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="mt-8">
                        <div className="flex flex-col items-center">
                            <div className="flex space-x-4">
                                <Button onClick={handlePlayPause}>
                                    {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </Button>
                                <Button onClick={handleTogglePlayback}>
                                    <RotateCcw className="mr-2 h-4 w-4" /> Replay
                                </Button>
                            </div>
                            <div className="mt-2 text-sm">
                                Status: {playbackStatus}
                            </div>
                        </div>
                    </div>
                </CredenzaBody>
            </CredenzaContent>
        </Credenza>
    );
};

export default AudioModal;