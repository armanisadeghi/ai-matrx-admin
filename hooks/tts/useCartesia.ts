'use client';
import {useState, useEffect, useCallback, useRef} from 'react';
import cartesia from "@/lib/cartesia/client";
import {
    OutputContainer,
    AudioEncoding,
    ModelId,
    VoiceOptions,
    Language,
    VoiceSpeed,
    Emotion,
    Intensity,
    EmotionName,
    EmotionLevel
} from '@/lib/cartesia/cartesia.types';
import {WebPlayer} from "@cartesia/cartesia-js";
import Source from '@cartesia/cartesia-js/wrapper/source';

interface UseCartesiaProps {
    container?: OutputContainer;
    encoding?: AudioEncoding;
    sampleRate?: number;
    modelId?: ModelId;
    voice?: VoiceOptions;
    language?: Language;
    bufferDuration?: number;
}

interface UseCartesiaResult {
    sendMessage: (transcript: string, speed?: VoiceSpeed, voice?: VoiceOptions, emotions?: Array<{
        emotion: EmotionName,
        intensity?: EmotionLevel
    }>) => Promise<void>;
    messages: any[];
    isConnected: boolean;
    error: Error | null;
    pausePlayback: () => Promise<void>;
    resumePlayback: () => Promise<void>;
    togglePlayback: () => Promise<void>;
    stopPlayback: () => Promise<void>;
    updateConfigs: (newConfigs: Partial<UseCartesiaProps>) => void;
    initializeAudio: () => Promise<void>; // New method to initialize audio
    isAudioInitialized: boolean; // Track if audio has been initialized
}

function formatEmotionControl(emotion: EmotionName, intensity?: EmotionLevel): string {
    return intensity ? `${emotion}:${intensity}` : emotion;
}

export function useCartesia(
    {
        container = OutputContainer.Raw,
        encoding = AudioEncoding.PCM_F32LE,
        sampleRate = 44100,
        modelId = ModelId.SonicEnglish,
        voice = {mode: "id", id: "a0e99841-438c-4a64-b679-ae501e7d6091"},
        language = Language.EN,
        bufferDuration = 1,
    }: UseCartesiaProps = {}): UseCartesiaResult {
    const [websocket, setWebsocket] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const [isAudioInitialized, setIsAudioInitialized] = useState(false);
    const [config, setConfig] = useState<UseCartesiaProps>({
        container,
        encoding,
        sampleRate,
        modelId,
        voice,
        language,
        bufferDuration
    });
    
    const playerRef = useRef<WebPlayer | null>(null);
    // Create a silent audio buffer to unlock Web Audio API
    const silentSourceRef = useRef<Source | null>(null);

    // Initialize websocket connection
    useEffect(() => {
        const ws = cartesia.tts.websocket({
            container: config.container,
            encoding: config.encoding,
            sampleRate: config.sampleRate,
        });
        
        ws.connect()
            .then(() => {
                setIsConnected(true);
                setWebsocket(ws);
                // Create the player but don't start AudioContext yet
                if (!playerRef.current) {
                    playerRef.current = new WebPlayer({bufferDuration: config.bufferDuration});
                }
            })
            .catch((err: Error) => {
                console.error(`Failed to connect to Cartesia: ${err}`);
                setError(err);
            });

        return () => {
            if (ws) {
                ws.disconnect();
            }
            if (playerRef.current) {
                playerRef.current.stop().catch(console.error);
            }
        };
    }, [config]);

    // Method to initialize Audio
    // This tricks the browser into activating the AudioContext through a user gesture
    const initializeAudio = useCallback(async () => {
        if (!playerRef.current) {
            throw new Error("Player not initialized");
        }
        
        if (!websocket || !isConnected) {
            throw new Error("WebSocket is not connected");
        }
        
        try {
            // Create a silent source to "warm up" the AudioContext
            // This is a workaround since WebPlayer doesn't expose the AudioContext directly
            if (!silentSourceRef.current) {
                // Create a tiny silent audio buffer
                const silentResponse = await websocket.send({
                    modelId: modelId,
                    voice: config.voice,
                    transcript: " ", // Just a space - minimal audio
                    language,
                });
                
                silentSourceRef.current = silentResponse.source;
            }
            
            // Play and immediately stop the silent source
            // This will initialize the AudioContext but not produce audible sound
            if (silentSourceRef.current) {
                await playerRef.current.play(silentSourceRef.current);
                await playerRef.current.stop();
                setIsAudioInitialized(true);
            }
        } catch (err) {
            console.error("Error initializing audio:", err);
            setError(err instanceof Error ? err : new Error('Failed to initialize audio'));
            throw err;
        }
    }, [websocket, isConnected, modelId, language, config.voice]);

    const updateConfigs = useCallback((newConfigs: Partial<UseCartesiaProps>) => {
        setConfig((prevConfig) => ({
            ...prevConfig,
            ...newConfigs,
        }));
    }, []);

    const sendMessage = useCallback(async (
        transcript: string,
        speed: VoiceSpeed = VoiceSpeed.NORMAL,
        voice: VoiceOptions = {mode: "id", id: "a0e99841-438c-4a64-b679-ae501e7d6091"},
        emotions?: Array<{ emotion: EmotionName, intensity?: EmotionLevel }>
    ) => {
        if (!websocket || !isConnected) {
            throw new Error("WebSocket is not connected");
        }
        
        // Make sure Audio is initialized before playing
        if (!isAudioInitialized) {
            try {
                await initializeAudio();
            } catch (err) {
                console.error("Failed to initialize audio:", err);
                throw err;
            }
        }
        
        try {
            const selectedModelId = language !== Language.EN ? ModelId.SonicMultilingual : modelId;
            const response = await websocket.send({
                modelId: selectedModelId,
                voice: {
                    ...voice,
                    __experimental_controls: {
                        speed,
                        emotion: emotions?.map(({emotion, intensity}) => formatEmotionControl(emotion, intensity)),
                    },
                },
                transcript,
                language,
            });
            
            response.on("message", (message: any) => {
                setMessages((prevMessages) => [...prevMessages, message]);
            });
            
            if (playerRef.current && response.source instanceof Source) {
                await playerRef.current.play(response.source);
            } else {
                throw new Error("Player not initialized or invalid source");
            }
        } catch (err) {
            console.error("Error sending message:", err);
            setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        }
    }, [websocket, isConnected, modelId, voice, language, isAudioInitialized, initializeAudio]);

    const pausePlayback = useCallback(async () => {
        if (!playerRef.current) return;
        
        try {
            await playerRef.current.pause();
        } catch (err) {
            console.error("Error pausing playback:", err);
            setError(err instanceof Error ? err : new Error('Unknown error occurred while pausing'));
        }
    }, []);

    const resumePlayback = useCallback(async () => {
        if (!playerRef.current) return;
        
        // Check if Audio is initialized before resuming
        if (!isAudioInitialized) {
            try {
                await initializeAudio();
            } catch (err) {
                console.error("Failed to initialize audio before resuming:", err);
                throw err;
            }
        }
        
        try {
            await playerRef.current.resume();
        } catch (err) {
            console.error("Error resuming playback:", err);
            setError(err instanceof Error ? err : new Error('Unknown error occurred while resuming'));
        }
    }, [isAudioInitialized, initializeAudio]);

    const togglePlayback = useCallback(async () => {
        if (!playerRef.current) return;
        
        // Check if Audio is initialized before toggling
        if (!isAudioInitialized) {
            try {
                await initializeAudio();
            } catch (err) {
                console.error("Failed to initialize audio before toggling:", err);
                throw err;
            }
        }
        
        try {
            await playerRef.current.toggle();
        } catch (err) {
            console.error("Error toggling playback:", err);
            setError(err instanceof Error ? err : new Error('Unknown error occurred while toggling'));
        }
    }, [isAudioInitialized, initializeAudio]);

    const stopPlayback = useCallback(async () => {
        if (!playerRef.current) return;
        
        try {
            await playerRef.current.stop();
        } catch (err) {
            console.error("Error stopping playback:", err);
            setError(err instanceof Error ? err : new Error('Unknown error occurred while stopping'));
        }
    }, []);

    return {
        sendMessage,
        messages,
        isConnected,
        error,
        pausePlayback,
        resumePlayback,
        togglePlayback,
        stopPlayback,
        updateConfigs,
        isAudioInitialized,
        initializeAudio,
    };
}