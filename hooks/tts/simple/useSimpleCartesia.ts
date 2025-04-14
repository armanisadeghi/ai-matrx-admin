"use client";
import { CartesiaClient, WebPlayer } from "@cartesia/cartesia-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Emotion } from "@/components/audio/VoiceConfigSelects";

type ConnectionState = "idle" | "fetching-token" | "connecting" | "ready" | "disconnected";

export function useSimpleCartesia() {
    const websocketRef = useRef<ReturnType<typeof CartesiaClient.prototype.tts.websocket> | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
    const [playerState, setPlayerState] = useState<"idle" | "playing">("idle");
    const [script, setScript] = useState("Hi. This is AI Matrix.");
    const [voiceId, setVoiceId] = useState("156fb8d2-335b-4950-9cb3-a2d33befec77");
    const [emotions, setEmotions] = useState<Emotion[]>([]);
    const [language, setLanguage] = useState("en");
    const [speed, setSpeed] = useState<number>(0);
    const [modelId, setModelId] = useState("sonic-2-2025-03-07");

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

    const speak = useCallback(async () => {
        const ctx = websocketRef.current;
        if (!ctx) {
            console.error("Not connected");
            return;
        }

        const resp = await ctx.send({
            modelId: modelId,
            voice: {
                mode: "id",
                id: voiceId,
                experimentalControls: {
                    speed: speed, // Now using numerical value directly
                    emotion: emotions.length > 0 ? emotions : [],
                },
            },
            language: language,
            transcript: script,
        });
        const player = new WebPlayer({ bufferDuration: 600 });
        setPlayerState("playing");
        await player.play(resp.source);
        setPlayerState("idle");
    }, [script, voiceId, emotions, language, speed, modelId]);

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

export default useSimpleCartesia;

export type SimpleCartesia = ReturnType<typeof useSimpleCartesia>;
