import { useState, useCallback, useEffect, useRef } from 'react';
import { WebPlayer } from '@cartesia/cartesia-js';
import cartesia from '@/lib/cartesia/client';
import {
    VoiceSpeed,
    AudioEncoding,
    Language,
    VoiceOptions,
    StreamRequest,
    EmotionControl
} from '@/lib/cartesia/cartesia.types';

interface UseTextToSpeechOptions {
    text: string;
    voiceId: string;
    speed: VoiceSpeed;
    emotions: EmotionControl[];
    language?: Language;
    modelId?: string;
}

const useTextToSpeech = (options: UseTextToSpeechOptions) => {
    const { text, voiceId, speed, emotions, language = Language.EN, modelId = 'sonic-english' } = options;

    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackStatus, setPlaybackStatus] = useState<'inactive' | 'playing' | 'paused' | 'finished'>('inactive');

    const websocketRef = useRef<any>(null);
    const playerRef = useRef<WebPlayer | null>(null);
    const sourceRef = useRef<any>(null);

    useEffect(() => {
        websocketRef.current = cartesia.tts.websocket({
            container: "raw",
            encoding: AudioEncoding.PCM_F32LE,
            sampleRate: 44100,
        });

        playerRef.current = new WebPlayer(websocketRef.current);

        return () => {
            websocketRef.current?.disconnect();
            playerRef.current?.stop();
        };
    }, []);

    const play = useCallback(async () => {
        if (!websocketRef.current) {
            console.error("WebSocket is not initialized");
            return;
        }

        try {
            await websocketRef.current.connect();

            const voiceOptions: VoiceOptions = {
                mode: "id",
                id: voiceId,
                __experimental_controls: {
                    speed: speed,
                    emotion: emotions,
                },
            };

            const request: StreamRequest = {
                modelId: modelId,
                transcript: text,
                voice: voiceOptions,
                language,
            };

            const response = await websocketRef.current.send(request);
            sourceRef.current = response.source;

            setIsPlaying(true);
            setPlaybackStatus('playing');
            await playerRef.current?.play(sourceRef.current);
            setPlaybackStatus('finished');
        } catch (error) {
            console.error("Error playing audio:", error);
            setPlaybackStatus('inactive');
        } finally {
            setIsPlaying(false);
        }
    }, [text, modelId, voiceId, language, speed, emotions]);

    const pause = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.pause();
            setIsPlaying(false);
            setPlaybackStatus('paused');
        }
    }, []);

    const resume = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.resume();
            setIsPlaying(true);
            setPlaybackStatus('playing');
        }
    }, []);

    const stop = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.stop();
            setIsPlaying(false);
            setPlaybackStatus('inactive');
        }
    }, []);

    return {
        play,
        pause,
        resume,
        stop,
        isPlaying,
        playbackStatus,
    };
};

export default useTextToSpeech;