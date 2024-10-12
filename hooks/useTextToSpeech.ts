import { useState, useCallback, useEffect, useRef } from 'react';
import Cartesia, { WebPlayer } from '@cartesia/cartesia-js';
import {
    VoiceSpeed,
    AudioEncoding,
    Language,
    EmotionControl,
    VoiceOptions,
    StreamRequest
} from '@/lib/cartesia/cartesia.types';

interface UseTextToSpeechOptions {
    text: string;
    apiKey: string;
    autoPlay?: boolean;
    onPlaybackEnd?: () => void;
    modelId?: string;
    voiceId?: string;
    language?: Language;
    speed?: VoiceSpeed;
    emotions?: EmotionControl[];
    audioEncoding?: AudioEncoding;
    sampleRate?: number;
    addTimestamps?: boolean;
}

const defaultOptions: Partial<UseTextToSpeechOptions> = {
    modelId: 'sonic-english',
    voiceId: '42b39f37-515f-4eee-8546-73e841679c1d',
    language: Language.EN,
    speed: VoiceSpeed.NORMAL,
    emotions: ['positivity:high', 'curiosity'],
    audioEncoding: AudioEncoding.PCM_F32LE,
    sampleRate: 44100,
    addTimestamps: false,
};

const useTextToSpeech = (options: UseTextToSpeechOptions) => {
    const {
        text,
        apiKey,
        autoPlay = false,
        onPlaybackEnd,
        modelId = defaultOptions.modelId,
        voiceId = defaultOptions.voiceId,
        language = defaultOptions.language,
        speed = defaultOptions.speed,
        emotions = defaultOptions.emotions,
        audioEncoding = defaultOptions.audioEncoding,
        sampleRate = defaultOptions.sampleRate,
        addTimestamps = defaultOptions.addTimestamps,
    } = options;

    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackStatus, setPlaybackStatus] = useState<'inactive' | 'playing' | 'paused' | 'finished'>('inactive');
    const [bufferStatus, setBufferStatus] = useState<'inactive' | 'buffering' | 'buffered'>('inactive');
    const [isWaiting, setIsWaiting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cartesiaRef = useRef<Cartesia | null>(null);
    const websocketRef = useRef<any>(null);
    const playerRef = useRef<WebPlayer | null>(null);
    const sourceRef = useRef<any>(null);
    const isInitializedRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    const cleanup = useCallback(() => {
        console.log("Cleanup called");
        if (playerRef.current) {
            try {
            playerRef.current.stop();
            } catch (error) {
                console.error("Error stopping player:", error);
            }
        }
        if (websocketRef.current) {
            try {
            websocketRef.current.disconnect();
            } catch (error) {
                console.error("Error disconnecting WebSocket:", error);
            }
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try {
                audioContextRef.current.close();
            } catch (error) {
                console.error("Error closing AudioContext:", error);
            }
        }
        setIsPlaying(false);
        setPlaybackStatus('inactive');
        setBufferStatus('inactive');
        setIsWaiting(false);
        setIsConnected(false);
        isInitializedRef.current = false;
    }, []);

    useEffect(() => {
        if (!isInitializedRef.current && apiKey) {
            console.log("Initializing Cartesia and WebSocket");
            try {
                cartesiaRef.current = new Cartesia({ apiKey });
                websocketRef.current = cartesiaRef.current.tts.websocket({
                    container: "raw",
                    encoding: audioEncoding,
                    sampleRate,
                });

                console.log("Initializing WebPlayer");
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                playerRef.current = new WebPlayer({
                    bufferDuration: 1,
                    audioContext: audioContextRef.current
                });

                isInitializedRef.current = true;

                if (autoPlay) {
                    console.log("AutoPlay is enabled, calling buffer");
                    buffer();
                }
            } catch (err) {
                console.error("Error during initialization:", err);
                setError("Failed to initialize text-to-speech. Please try again.");
            }
        }

        return cleanup;
    }, [apiKey, audioEncoding, sampleRate, autoPlay, cleanup]);

    const buffer = useCallback(async () => {
        if (!apiKey || !websocketRef.current) {
            console.error("Cartesia API key is not set or WebSocket is not initialized");
            setError("Text-to-speech is not properly initialized. Please check your API key.");
            return;
        }

        try {
            setIsWaiting(true);
            setBufferStatus('buffering');
            console.log("Connecting to WebSocket");
            await websocketRef.current.connect();
            setIsConnected(true);

            console.log("Sending TTS request");
            const voiceOptions: VoiceOptions = {
                mode: "id",
                id: voiceId,
                __experimental_controls: {
                    speed,
                    emotion: emotions,
                },
            };

            const request: StreamRequest = {
                model_id: modelId,
                transcript: text,
                voice: voiceOptions,
                language,
                add_timestamps: addTimestamps,
            };

            const response = await websocketRef.current.send(request);

            console.log("Received TTS response", response);
            sourceRef.current = response.source;

            if (addTimestamps) {
                response.on("timestamps", (timestamps) => {
                    console.log("Received timestamps:", timestamps);
                });
            }

            setBufferStatus('buffered');
            setIsWaiting(false);
        } catch (error) {
            console.error("Error buffering audio:", error);
            setBufferStatus('inactive');
            setIsWaiting(false);
            setError("Failed to buffer audio. Please try again.");
        }
    }, [text, apiKey, modelId, voiceId, language, speed, emotions, addTimestamps]);

    const play = useCallback(async () => {
        if (!playerRef.current || !sourceRef.current) {
            console.log("Player or source not ready, buffering audio");
            await buffer();
        }

        try {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            console.log("Starting playback");
            setIsPlaying(true);
            setPlaybackStatus('playing');
            await playerRef.current?.play(sourceRef.current);
            console.log("Playback finished");
            setPlaybackStatus('finished');
        } catch (error) {
            console.error("Error playing audio:", error);
            setPlaybackStatus('inactive');
            setError("Failed to play audio. Please try again.");
        } finally {
            setIsPlaying(false);
            onPlaybackEnd?.();
        }
    }, [buffer, onPlaybackEnd]);

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
        cleanup();
    }, [cleanup]);

    const restart = useCallback(async () => {
        await stop();
        await buffer();
        await play();
    }, [stop, buffer, play]);

    const toggle = useCallback(async () => {
        if (isPlaying) {
            await pause();
        } else {
            await play();
        }
    }, [isPlaying, pause, play]);

    return {
        buffer,
        play,
        pause,
        resume,
        stop,
        restart,
        toggle,
        isPlaying,
        playbackStatus,
        bufferStatus,
        isWaiting,
        isConnected,
        error,
    };
};

export default useTextToSpeech;