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
import {Source, WebPlayer} from "@cartesia/cartesia-js";

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
                playerRef.current = new WebPlayer({bufferDuration: config.bufferDuration});
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
    }, [config]); // Trigger useEffect when config changes

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
        try {
            const selectedModelId = language !== Language.EN ? ModelId.SonicMultilingual : modelId;
            const response = await websocket.send({
                model_id: selectedModelId,
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
    }, [websocket, isConnected, modelId, voice, language]);

    const pausePlayback = useCallback(async () => {
        if (playerRef.current) {
            try {
                await playerRef.current.pause();
            } catch (err) {
                console.error("Error pausing playback:", err);
                setError(err instanceof Error ? err : new Error('Unknown error occurred while pausing'));
            }
        }
    }, []);

    const resumePlayback = useCallback(async () => {
        if (playerRef.current) {
            try {
                await playerRef.current.resume();
            } catch (err) {
                console.error("Error resuming playback:", err);
                setError(err instanceof Error ? err : new Error('Unknown error occurred while resuming'));
            }
        }
    }, []);

    const togglePlayback = useCallback(async () => {
        if (playerRef.current) {
            try {
                await playerRef.current.toggle();
            } catch (err) {
                console.error("Error toggling playback:", err);
                setError(err instanceof Error ? err : new Error('Unknown error occurred while toggling'));
            }
        }
    }, []);

    const stopPlayback = useCallback(async () => {
        if (playerRef.current) {
            try {
                await playerRef.current.stop();
            } catch (err) {
                console.error("Error stopping playback:", err);
                setError(err instanceof Error ? err : new Error('Unknown error occurred while stopping'));
            }
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
    };
}
