'use client';

import React, { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from 'lucide-react';
import useTextToSpeech from '@/hooks/useTextToSpeech'; // Adjust the import path as needed
import { Language, VoiceSpeed, EmotionControl } from '@/lib/cartesia/cartesia.types'; // Adjust the import path as needed

interface TextToSpeechPlayerProps {
    text: string;
    onPlaybackEnd?: () => void;
    modelId?: string;
    voiceId?: string;
    language?: Language;
    speed?: VoiceSpeed;
    emotions?: EmotionControl[];
    sampleRate?: number;
    addTimestamps?: boolean;
    onClose?: () => void;
}

const TextToSpeechPlayer: React.FC<TextToSpeechPlayerProps> = ({
                                                                   text,
                                                                   onPlaybackEnd,
                                                                   modelId,
                                                                   voiceId,
                                                                   language,
                                                                   speed = VoiceSpeed.NORMAL,
                                                                   emotions,
                                                                   sampleRate,
                                                                   addTimestamps,
                                                                   onClose,
                                                               }) => {
    const apiKey = process.env.NEXT_PUBLIC_CARTESIA_API_KEY;
    const hasPlayedRef = useRef(false);

    const {
        play,
        pause,
        restart,
        stop,
        isPlaying,
        playbackStatus,
        bufferStatus,
        isWaiting,
        error,
    } = useTextToSpeech({
        text,
        apiKey: apiKey || '',
        onPlaybackEnd,
        modelId,
        voiceId,
        language,
        speed,
        emotions,
        sampleRate,
        addTimestamps,
    });

    useEffect(() => {
        const playAudio = async () => {
            if (!hasPlayedRef.current) {
                try {
                    await play();
                    hasPlayedRef.current = true;
                } catch (error) {
                    console.error("Error playing audio:", error);
                }
            }
        };

        playAudio();

        return () => {
            stop();
            if (onClose) onClose();
        };
    }, [play, stop, onClose]);

    if (!apiKey) return <div>API key not set. Unable to play audio.</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="flex flex-col items-center">
            <div className="flex space-x-4">
                {isWaiting ? (
                    <Button disabled>Buffering...</Button>
                ) : isPlaying ? (
                    <Button onClick={pause}>
                        <Pause className="mr-2 h-4 w-4"/> Pause
                    </Button>
                ) : (
                    <Button onClick={play}>
                        <Play className="mr-2 h-4 w-4"/> Play
                    </Button>
                )}
                <Button onClick={restart} disabled={isWaiting}>
                    <RotateCcw className="mr-2 h-4 w-4"/> Restart
                </Button>
            </div>
            <div className="mt-2 text-sm">
                Status: {isWaiting ? bufferStatus : playbackStatus}
            </div>
        </div>
    );
};

export default TextToSpeechPlayer;