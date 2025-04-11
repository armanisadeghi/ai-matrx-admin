"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CartesiaClient, WebPlayer } from "@cartesia/cartesia-js";
import { Play, Pause, RotateCcw } from "lucide-react";
import VoiceConfigSelects from "./VoiceConfigSelects";
import { Textarea } from "@/components/ui";

interface TextToSpeechPlayerProps {
    text: string;
    autoPlay?: boolean;
    onPlaybackEnd?: () => void;
}

export type TtsStatus =
    | "initialLoad"
    | "websocketConnected"
    | "readyForAutoPlay"
    | "connectedNoAutoPlay"
    | "disconnected"
    | "reconnected"
    | "buffering"
    | "playing"
    | "paused"
    | "finished"
    | "error";

const TextToSpeechPlayer: React.FC<TextToSpeechPlayerProps> = ({ text, autoPlay = false, onPlaybackEnd }) => {
    const apiKey = process.env.NEXT_PUBLIC_CARTESIA_API_KEY;
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
    const [playbackStatus, setPlaybackStatus] = useState<TtsStatus>("initialLoad");
    const cartesiaRef = useRef<CartesiaClient | null>(null);
    const websocketRef = useRef<any>(null);
    const playerRef = useRef<WebPlayer | null>(null);
    const sourceRef = useRef<any>(null);
    const [editableText, setEditableText] = useState(text);
    const [voiceId, setVoiceId] = useState("156fb8d2-335b-4950-9cb3-a2d33befec77");
    const [emotion, setEmotion] = useState("positivity:high");
    const [intensity, setIntensity] = useState("medium");
    const [speed, setSpeed] = useState("normal");
    const [encoding, setEncoding] = useState("pcm_f32le");
    const [language, setLanguage] = useState("en");

    
    useEffect(() => {
        cartesiaRef.current = new CartesiaClient({ apiKey: apiKey || "" });
        websocketRef.current = cartesiaRef.current.tts.websocket({
            container: "raw",
            encoding: "pcm_f32le",
            sampleRate: 44100,
        });
        playerRef.current = new WebPlayer({ bufferDuration: 0.25 });

        try {
            websocketRef.current.connect();
        } catch (error) {
            console.error(`Failed to connect to Cartesia: ${error}`);
            throw error;
        }
        
        setPlaybackStatus("websocketConnected");

        if (autoPlay) {
            handlePlay();
        }

        return () => {
            websocketRef.current?.disconnect();
            setPlaybackStatus("disconnected");
        };
    }, [apiKey, autoPlay]);

    const handlePlay = useCallback(async () => {
        if (!apiKey || !websocketRef.current || !playerRef.current) {
            console.error("Cartesia API key is not set or WebSocket/Player is not initialized");
            setPlaybackStatus("error");
            return;
        }

        try {
            setIsPlaying(true);
            setPlaybackStatus("buffering");

            const response = await websocketRef.current.send({
                modelId: "sonic-english",
                voice: {
                    mode: "id",
                    id: "156fb8d2-335b-4950-9cb3-a2d33befec77",
                    __experimental_controls: {
                        speed: speed,
                        emotion: ["positivity:high", "curiosity"],
                    },
                },
                transcript: editableText,
            });


            sourceRef.current = response.source;

            if (!sourceRef.current) {
                console.error("Source reference is null or undefined.");
                setPlaybackStatus("error");
                return;
            }

            // Attach error and event listeners to the source and player to capture more details
            sourceRef.current.on("error", (error: any) => {
                console.error("Audio source error: ", error);
            });

            sourceRef.current.on("end", () => {
                console.log("Audio source ended.");
            });

            setPlaybackStatus("playing");

            await playerRef.current.play(sourceRef.current);

            console.log("Audio is playing...");
            setPlaybackStatus("finished");
            setHasPlayedOnce(true); // Mark that we've played audio at least once
        } catch (error) {
            console.error("Error playing audio:", error);
            setPlaybackStatus("error");
        } finally {
            setIsPlaying(false);
            onPlaybackEnd?.();
        }
    }, [editableText, onPlaybackEnd, apiKey]);

    const handlePause = useCallback(async () => {
        if (playerRef.current) {
            await playerRef.current.pause();
            setIsPlaying(false);
            setPlaybackStatus("paused");
        }
    }, []);

    const handleResume = useCallback(async () => {
        if (playerRef.current) {
            await playerRef.current.resume();
            setIsPlaying(true);
            setPlaybackStatus("playing");
        }
    }, []);

    const handleReplay = useCallback(async () => {
        if (playerRef.current && sourceRef.current) {
            setIsPlaying(true);
            setPlaybackStatus("playing");
            await playerRef.current.play(sourceRef.current);
            setPlaybackStatus("finished");
            setIsPlaying(false);
        }
    }, []);

    const isButtonDisabled = (action: string): boolean => {
        switch (action) {
            case "play":
                return isPlaying;
            case "pause":
                return !isPlaying;
            case "resume":
                return playbackStatus !== "paused";
            case "replay":
                return !hasPlayedOnce || isPlaying;
            default:
                return false;
        }
    };

    return (
        <div className="flex flex-col w-full">
            <Textarea
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                placeholder="Enter text to speak..."
                className="w-full resize-none mb-4 h-96"
            />
            <VoiceConfigSelects
                isPlaying={isPlaying}
                onVoiceChange={setVoiceId}
                onEmotionChange={setEmotion}
                onIntensityChange={setIntensity}
                onSpeedChange={setSpeed}
                onEncodingChange={setEncoding}
                onLanguageChange={setLanguage}
            />
            <div className="flex space-x-4">
                <Button onClick={handlePlay} disabled={isButtonDisabled("play")}>
                    <Play className="mr-2 h-4 w-4" /> Play
                </Button>
                <Button onClick={handlePause} disabled={isButtonDisabled("pause")}>
                    <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
                <Button onClick={handleResume} disabled={isButtonDisabled("resume")}>
                    <Play className="mr-2 h-4 w-4" /> Resume
                </Button>
                <Button onClick={handleReplay} disabled={isButtonDisabled("replay")}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Replay
                </Button>
            </div>
            <div className="mt-2 text-sm">New Playback Status: {playbackStatus}</div>
        </div>
    );
};

export default TextToSpeechPlayer;
