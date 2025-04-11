// components/audio/TextToSpeechPlayer.tsx
'use client';

import React, {useState, useCallback, useEffect, useRef} from 'react';
import {Button} from "@/components/ui/button";
import { CartesiaClient, WebPlayer } from '@cartesia/cartesia-js';
import {Play, Pause, RotateCcw, Square} from 'lucide-react';

export interface AudioPlaybackState {
    isPlaying: boolean;
    isPaused: boolean;
    isComplete: boolean;
    status: string;
}

interface TextToSpeechPlayerProps {
    text: string;
    autoPlay?: boolean;
    onPlaybackEnd?: () => void;
    onPlaybackStateChange?: (state: Partial<AudioPlaybackState>) => void;
    onTextProgress?: (progress: number) => void;
    playbackState: AudioPlaybackState;
    forceStop?: boolean;
}

const TextToSpeechPlayer: React.FC<TextToSpeechPlayerProps> = (
    {
        text,
        autoPlay = false,
        onPlaybackEnd,
        onPlaybackStateChange,
        onTextProgress,
        playbackState,
        forceStop = false
    }) => {
    const apiKey = process.env.NEXT_PUBLIC_CARTESIA_API_KEY;
    const [isLoading, setIsLoading] = useState(false);
    const [playbackStatus, setPlaybackStatus] = useState('');
    const [audioSource, setAudioSource] = useState<any>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const cartesiaRef = useRef<CartesiaClient | null>(null);
    const websocketRef = useRef<any>(null);
    const playerRef = useRef<WebPlayer | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const cleanupRef = useRef(false);

    const cleanup = useCallback(() => {
        if (cleanupRef.current) return;
        cleanupRef.current = true;

        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = undefined;
        }

        if (playerRef.current) {
            playerRef.current.stop();
        }

        if (websocketRef.current?.isConnected) {
            websocketRef.current.disconnect();
        }
    }, []);

    // Initialize Cartesia and WebSocket once
    useEffect(() => {
        if (!isInitialized && apiKey && !cleanupRef.current) {
            cartesiaRef.current = new CartesiaClient({apiKey});
            websocketRef.current = cartesiaRef.current.tts.websocket({
                container: "raw",
                encoding: "pcm_f32le",
                sampleRate: 44100
            });
            playerRef.current = new WebPlayer({bufferDuration: 1});
            setIsInitialized(true);
        }

        return () => cleanup();
    }, [apiKey, cleanup]);

    // Handle force stop
    useEffect(() => {
        if (forceStop) {
            handleStop();
        }
    }, [forceStop]);

    const clearProgress = useCallback(() => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = undefined;
        }
    }, []);

    const updateState = useCallback((state: Partial<AudioPlaybackState>) => {
        if (!cleanupRef.current && onPlaybackStateChange) {
            onPlaybackStateChange(state);
        }
    }, [onPlaybackStateChange]);

    const startProgressTracking = useCallback(() => {
        clearProgress();

        if (cleanupRef.current) return;

        let progress = 0;
        const totalDuration = text.length;
        const interval = 50;
        const incrementPerInterval = (interval / (totalDuration * 50)) * 100;

        progressIntervalRef.current = setInterval(() => {
            if (cleanupRef.current) {
                clearProgress();
                return;
            }

            progress += incrementPerInterval;
            if (progress >= 100) {
                clearProgress();
                progress = 100;
            }
            onTextProgress?.(progress);
        }, interval);
    }, [text.length, onTextProgress, clearProgress]);

    const fetchAudioSource = useCallback(async () => {
        if (!isInitialized || !websocketRef.current || cleanupRef.current) return null;

        try {
            setIsLoading(true);
            setPlaybackStatus('Connecting...');

            if (!websocketRef.current.isConnected) {
                await websocketRef.current.connect();
            }

            if (cleanupRef.current) return null;

            setPlaybackStatus('Buffering audio...');

            const response = await websocketRef.current.send({
                modelId: "sonic-english",
                voice: {
                    mode: "id",
                    id: "156fb8d2-335b-4950-9cb3-a2d33befec77",
                    __experimental_controls: {
                        "speed": "normal",
                        "emotion": [
                            "positivity:high",
                            "curiosity"
                        ]
                    },
                },
                transcript: text
            });

            if (cleanupRef.current) return null;

            setAudioSource(response.source);
            setPlaybackStatus('Ready to play');
            return response.source;
        } catch (error) {
            console.error("Error fetching audio:", error);
            setPlaybackStatus('Error fetching audio');
            return null;
        } finally {
            if (!cleanupRef.current) {
                setIsLoading(false);
            }
        }
    }, [isInitialized, text]);

    const handlePlay = useCallback(async () => {
        if (!playerRef.current || !isInitialized || cleanupRef.current) return;

        try {
            let source = audioSource;
            if (!source) {
                source = await fetchAudioSource();
                if (!source || cleanupRef.current) return;
            }

            updateState({
                isPlaying: true,
                isPaused: false,
                status: 'Starting'
            });

            if (cleanupRef.current) return;

            await playerRef.current.play(source);

            if (cleanupRef.current) return;

            updateState({
                isPlaying: false,
                isComplete: true,
                status: 'Finished'
            });
            onPlaybackEnd?.();
        } catch (error) {
            if (!cleanupRef.current) {
                console.error("Error playing audio:", error);
                updateState({
                    isPlaying: false,
                    status: 'Error'
                });
            }
        }
    }, [audioSource, fetchAudioSource, isInitialized, updateState, onPlaybackEnd]);

    const handlePause = useCallback(async () => {
        if (playerRef.current && playbackState.isPlaying && !cleanupRef.current) {
            await playerRef.current.pause();
            updateState({
                isPlaying: false,
                isPaused: true,
                status: 'Paused'
            });
            setPlaybackStatus('Paused');
            clearProgress();
        }
    }, [playbackState.isPlaying, updateState, clearProgress]);

    const handleResume = useCallback(async () => {
        if (playerRef.current && playbackState.isPaused && !cleanupRef.current) {
            await playerRef.current.resume();
            updateState({
                isPlaying: true,
                isPaused: false,
                status: 'Playing'
            });
            setPlaybackStatus('Playing audio...');
            startProgressTracking();
        }
    }, [playbackState.isPaused, updateState, startProgressTracking]);

    const handleStop = useCallback(async () => {
        if (!playerRef.current) return;

        try {
            await playerRef.current.stop();
            clearProgress();

            if (!cleanupRef.current) {
                updateState({
                    isPlaying: false,
                    isPaused: false,
                    isComplete: true,
                    status: 'Stopped'
                });
                setPlaybackStatus('Stopped');
                onPlaybackEnd?.();
            }
        } catch (error) {
            console.error("Error stopping playback:", error);
        }
    }, [updateState, clearProgress, onPlaybackEnd]);

    // Fetch audio on mount or text change
    useEffect(() => {
        if (isInitialized && !audioSource && !isLoading && !cleanupRef.current) {
            fetchAudioSource();
        }
    }, [isInitialized, audioSource, isLoading, fetchAudioSource]);

    // Handle autoPlay
    useEffect(() => {
        if (autoPlay && audioSource && !playbackState.isPlaying &&
            !playbackState.isPaused && !isLoading && !cleanupRef.current) {
            handlePlay();
        }
    }, [autoPlay, audioSource, playbackState.isPlaying, playbackState.isPaused, isLoading, handlePlay]);

    if (!apiKey) return <div>API key not set. Unable to play audio.</div>;

    return (
        <div className="flex flex-col items-center">
            <div className="flex space-x-4">
                <Button
                    onClick={playbackState.isPaused ? handleResume : handlePlay}
                    disabled={isLoading || cleanupRef.current}
                >
                    <Play className="mr-2 h-4 w-4"/>
                    {playbackState.isPaused ? 'Resume' : 'Play'}
                </Button>

                <Button
                    onClick={handlePause}
                    disabled={!playbackState.isPlaying || isLoading || cleanupRef.current}
                >
                    <Pause className="mr-2 h-4 w-4"/>
                    Pause
                </Button>

                <Button
                    onClick={handleStop}
                    disabled={(!playbackState.isPlaying && !playbackState.isPaused) ||
                        isLoading || cleanupRef.current}
                    variant="secondary"
                >
                    <Square className="mr-2 h-4 w-4"/>
                    Stop
                </Button>

                <Button
                    onClick={handlePlay}
                    disabled={isLoading || !audioSource ||
                        playbackState.isPlaying || cleanupRef.current}
                    variant="secondary"
                >
                    <RotateCcw className="mr-2 h-4 w-4"/>
                    Replay
                </Button>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
                Audio Status: {isLoading ? 'Loading audio...' : playbackStatus}
            </div>
        </div>
    );
};

export default TextToSpeechPlayer;
