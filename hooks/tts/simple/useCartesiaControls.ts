"use client";
import { CartesiaClient, WebPlayer } from "@cartesia/cartesia-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Emotion } from "@/components/audio/VoiceConfigSelects";

type ConnectionState = "idle" | "fetching-token" | "connecting" | "ready" | "disconnected";
type PlayerState = "idle" | "playing" | "paused";

export function useCartesiaControls() {
    const websocketRef = useRef<ReturnType<typeof CartesiaClient.prototype.tts.websocket> | null>(null);
    const playerRef = useRef<WebPlayer | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
    const [playerState, setPlayerState] = useState<PlayerState>("idle");
    const [script, setScript] = useState("Hi. This is AI Matrix.");
    const [voiceId, setVoiceId] = useState("156fb8d2-335b-4950-9cb3-a2d33befec77");
    const [emotions, setEmotions] = useState<Emotion[]>([]);
    const [language, setLanguage] = useState("en");
    const [speed, setSpeed] = useState<number>(0);
    const [modelId, setModelId] = useState("sonic-turbo");

    const connect = useCallback(async () => {
        setConnectionState("fetching-token");
        const res = await fetch("/api/cartesia");
        const data = await res.json();
        setConnectionState("connecting");
        const cartesia = new CartesiaClient();
        websocketRef.current = cartesia.tts.websocket({
            container: "raw",
            encoding: "pcm_f32le",
            sampleRate: 44100,
        });
        const ctx = await websocketRef.current?.connect({
            accessToken: data.token,
        });
        setConnectionState("ready");
        ctx.on("close", () => {
            setConnectionState("disconnected");
            websocketRef.current = null;
        });
    }, []);

    useEffect(() => {
        connect();
    }, [connect]);

    const resume = useCallback(async () => {
        if (playerRef.current && playerState === "paused") {
            try {
                await playerRef.current.resume();
                setPlayerState("playing");
            } catch (error) {
                console.error("Error resuming audio:", error);
            }
        }
    }, [playerState]);

    const speak = useCallback(async (optionalScript?: string) => {
        const ctx = websocketRef.current;
        if (!ctx) {
            console.error("Not connected");
            return;
        }
        
        // Create a new player if one doesn't exist or if we're starting a new speech
        if (!playerRef.current || playerState === "idle") {
            playerRef.current = new WebPlayer({ bufferDuration: 600 });
        }
        
        // If player is paused, resume instead of starting new speech
        if (playerState === "paused") {
            await resume();
            return;
        }

        // Use the optionalScript if provided, otherwise use the state script
        const textToSpeak = optionalScript !== undefined ? optionalScript : script;
        
        // Update the script state if optionalScript is provided
        if (optionalScript !== undefined) {
            setScript(optionalScript);
        }

        const resp = await ctx.send({
            modelId: modelId,
            voice: {
                mode: "id",
                id: voiceId,
                experimentalControls: {
                    speed: speed,
                    emotion: emotions.length > 0 ? emotions : [],
                },
            },
            language: language,
            transcript: textToSpeak,
        });

        setPlayerState("playing");
        try {
            await playerRef.current.play(resp.source);
            setPlayerState("idle");
        } catch (error) {
            console.error("Error playing audio:", error);
            setPlayerState("idle");
        }
    }, [voiceId, emotions, language, speed, modelId, playerState, script, resume]);


    const pause = useCallback(async () => {
        if (playerRef.current && playerState === "playing") {
            try {
                await playerRef.current.pause();
                setPlayerState("paused");
            } catch (error) {
                console.error("Error pausing audio:", error);
            }
        }
    }, [playerState]);


    const toggle = useCallback(async () => {
        if (!playerRef.current) return;
        
        try {
            await playerRef.current.toggle();
            setPlayerState(prevState => 
                prevState === "playing" ? "paused" : 
                prevState === "paused" ? "playing" : prevState
            );
        } catch (error) {
            console.error("Error toggling audio:", error);
        }
    }, []);

    const stop = useCallback(async () => {
        if (playerRef.current && (playerState === "playing" || playerState === "paused")) {
            try {
                await playerRef.current.stop();
                setPlayerState("idle");
            } catch (error) {
                console.error("Error stopping audio:", error);
            }
        }
    }, [playerState]);

    const handleScriptChange = (newScript: string) => {
        setScript(newScript);
    };

    const handleVoiceChange = (newVoiceId: string) => {
        setVoiceId(newVoiceId);
    };

    const handleEmotionsChange = (newEmotions: Emotion[]) => {
        setEmotions(newEmotions);
    };

    const handleLanguageChange = (newLanguage: string) => {
        setLanguage(newLanguage);
    };

    const handleSpeedChange = (newSpeed: number) => {
        setSpeed(newSpeed);
    };

    const handleModelChange = (newModelId: string) => {
        setModelId(newModelId);
    };

    return {
        connectionState,
        playerState,
        speak,
        pause,
        resume,
        toggle,
        stop,
        handleScriptChange,
        handleVoiceChange,
        handleEmotionsChange,
        handleLanguageChange,
        handleSpeedChange,
        handleModelChange,
        script,
        voiceId,
        emotions,
        language,
        speed,
        modelId,
    };
}

export default useCartesiaControls;
export type CartesiaControls = ReturnType<typeof useCartesiaControls>;