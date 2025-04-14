'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { CartesiaClient, WebPlayer } from '@cartesia/cartesia-js';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TextToSpeechPlayerProps {
    text: string;
    autoPlay?: boolean;
    onPlaybackEnd?: () => void;
}

export type TtsStatus =
    'initialLoad'
    | 'websocketConnected'
    | 'readyForAutoPlay'
    | 'connectedNoAutoPlay'
    | 'disconnected'
    | 'reconnected'
    | 'buffering'
    | 'playing'
    | 'paused'
    | 'finished'
    | 'error';

const TextToSpeechPlayer: React.FC<TextToSpeechPlayerProps> = ({ text, autoPlay = false, onPlaybackEnd }) => {
    const apiKey = process.env.NEXT_PUBLIC_CARTESIA_API_KEY;
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
    const [playbackStatus, setPlaybackStatus] = useState<TtsStatus>('initialLoad');
    const cartesiaRef = useRef<CartesiaClient | null>(null);
    const websocketRef = useRef<any>(null);
    const playerRef = useRef<WebPlayer | null>(null);
    const sourceRef = useRef<any>(null);

    // Utility to set status with logging
    const updatePlaybackStatus = (status: TtsStatus, identifier: string) => {
        console.log(`${identifier}: ${status}`);
        setPlaybackStatus(status);
    };

    useEffect(() => {
        cartesiaRef.current = new CartesiaClient({ apiKey: apiKey || '' });
        websocketRef.current = cartesiaRef.current.tts.websocket({
            container: "raw",
            encoding: "pcm_f32le",
            sampleRate: 44100
        });
        playerRef.current = new WebPlayer({ bufferDuration: .25 });

        updatePlaybackStatus('websocketConnected', 'First useEffect');

        if (autoPlay) {
            handlePlay();
        }

        return () => {
            websocketRef.current?.disconnect();
            updatePlaybackStatus('disconnected', 'First useEffect');
        };
    }, [apiKey, autoPlay]);

    const handlePlay = useCallback(async () => {
        if (!apiKey || !websocketRef.current || !playerRef.current) {
            console.error("Cartesia API key is not set or WebSocket/Player is not initialized");
            updatePlaybackStatus('error', 'handlePlay');
            return;
        }

        console.log("Handle Play Before Try... TEXT: ", text);

        try {
            setIsPlaying(true);
            updatePlaybackStatus('buffering', 'handlePlay');
            await websocketRef.current.connect();
            console.log("Handle Play after current.connect()... TEXT: ", text);

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
                    }
                },
                transcript: text
            });

            console.log("Handle Play after send... response: ", response);

            sourceRef.current = response.source;

            if (!sourceRef.current) {
                console.error("Source reference is null or undefined.");
                updatePlaybackStatus('error', 'handlePlay');
                return;
            }

            // Attach error and event listeners to the source and player to capture more details
            sourceRef.current.on('error', (error: any) => {
                console.error("Audio source error: ", error);
            });

            sourceRef.current.on('end', () => {
                console.log("Audio source ended.");
            });

            updatePlaybackStatus('playing', 'handlePlay');

            // Log the player instance and the source
            console.log("Player instance:", playerRef.current);
            console.log("Source details:", sourceRef.current);

            await playerRef.current.play(sourceRef.current);

            console.log("Audio is playing...");
            updatePlaybackStatus('finished', 'handlePlay');
            setHasPlayedOnce(true);  // Mark that we've played audio at least once
        } catch (error) {
            console.error("Error playing audio:", error);
            updatePlaybackStatus('error', 'handlePlay');
        } finally {
            setIsPlaying(false);
            onPlaybackEnd?.();
        }
    }, [text, onPlaybackEnd, apiKey]);

    const handlePause = useCallback(async () => {
        if (playerRef.current) {
            await playerRef.current.pause();
            setIsPlaying(false);
            updatePlaybackStatus('paused', 'handlePause');
        }
    }, []);

    const handleResume = useCallback(async () => {
        if (playerRef.current) {
            await playerRef.current.resume();
            setIsPlaying(true);
            updatePlaybackStatus('playing', 'handleResume');
        }
    }, []);

    const handleReplay = useCallback(async () => {
        if (playerRef.current && sourceRef.current) {
            setIsPlaying(true);
            updatePlaybackStatus('playing', 'handleReplay');
            await playerRef.current.play(sourceRef.current);
            updatePlaybackStatus('finished', 'handleReplay');
        }
    }, []);

    const isButtonDisabled = (action: string): boolean => {
        switch (action) {
            case 'play':
                return isPlaying || hasPlayedOnce;
            case 'pause':
                return !isPlaying;
            case 'resume':
                return playbackStatus !== 'paused';
            case 'replay':
                return !hasPlayedOnce || isPlaying;
            default:
                return false;
        }
    };

    if (!apiKey) return <div>API key not set. Unable to play audio.</div>;

    return (
        <div className="flex flex-col items-center">
            <div className="flex space-x-4">
                <Button onClick={handlePlay} disabled={isButtonDisabled('play')}>
                    <Play className="mr-2 h-4 w-4" /> Play new
                </Button>
                <Button onClick={handlePause} disabled={isButtonDisabled('pause')}>
                    <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
                <Button onClick={handleResume} disabled={isButtonDisabled('resume')}>
                    <Play className="mr-2 h-4 w-4" /> Resume
                </Button>
                <Button onClick={handleReplay} disabled={isButtonDisabled('replay')}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Replay
                </Button>
            </div>
            <div className="mt-2 text-sm">
                New Playback Status: {playbackStatus}
            </div>
        </div>
    );
};

export default TextToSpeechPlayer;
