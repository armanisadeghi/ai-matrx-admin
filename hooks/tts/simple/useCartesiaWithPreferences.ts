"use client";
import { CartesiaClient, WebPlayer } from "@cartesia/cartesia-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { parseMarkdownToText } from "@/utils/markdown-processors/parse-markdown-for-speech";

type ConnectionState = "idle" | "fetching-token" | "connecting" | "ready" | "disconnected";
type PlayerState = "idle" | "playing" | "paused";

export interface UseCartesiaWithPreferencesOptions {
  autoPlay?: boolean;
  processMarkdown?: boolean;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: string) => void;
}

export function useCartesiaWithPreferences({
  autoPlay = false,
  processMarkdown = true,
  onPlaybackStart,
  onPlaybackEnd,
  onError,
}: UseCartesiaWithPreferencesOptions = {}) {
  const websocketRef = useRef<ReturnType<typeof CartesiaClient.prototype.tts.websocket> | null>(null);
  const playerRef = useRef<WebPlayer | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [playerState, setPlayerState] = useState<PlayerState>("idle");

  // Get voice preferences from Redux
  const voicePreferences = useAppSelector((state) => state.userPreferences.voice);
  const voiceId = voicePreferences.voice || "156fb8d2-335b-4950-9cb3-a2d33befec77"; // Default voice
  const language = voicePreferences.language || "en";
  const speed = voicePreferences.speed || 0;
  const modelId = "sonic-3";

  const connect = useCallback(async () => {
    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to audio service";
      setConnectionState("disconnected");
      onError?.(errorMessage);
    }
  }, []); // Remove onError from dependencies to prevent infinite loop

  useEffect(() => {
    connect();
    
    return () => {
      if (websocketRef.current) {
        websocketRef.current.disconnect();
      }
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, []); // Only connect once on mount

  const speak = useCallback(
    async (text: string) => {
      const ctx = websocketRef.current;
      if (!ctx) {
        onError?.("Not connected to audio service");
        return;
      }

      if (!text?.trim()) {
        onError?.("No text to speak");
        return;
      }

      try {
        // Process markdown if enabled
        const processedText = processMarkdown ? parseMarkdownToText(text) : text;

        // Create a new player for streaming playback
        if (!playerRef.current || playerState === "idle") {
          playerRef.current = new WebPlayer({ bufferDuration: 0.25 }); // 250ms buffer for fast streaming
        }

        // If player is paused, resume instead of starting new speech
        if (playerState === "paused") {
          await playerRef.current.resume();
          setPlayerState("playing");
          return;
        }

        onPlaybackStart?.();

        const resp = await ctx.send({
          modelId: modelId,
          voice: {
            mode: "id",
            id: voiceId,
            experimentalControls: {
              speed: speed,
              emotion: [], // Can be extended to use emotion preferences if needed
            },
          },
          language: language,
          transcript: processedText,
        });

        setPlayerState("playing");
        
        try {
          await playerRef.current.play(resp.source);
          setPlayerState("idle");
          onPlaybackEnd?.();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Playback failed";
          console.error("Error playing audio:", error);
          setPlayerState("idle");
          onError?.(errorMessage);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Speech generation failed";
        console.error("Error generating speech:", error);
        setPlayerState("idle");
        onError?.(errorMessage);
      }
    },
    [voiceId, language, speed, modelId, playerState, processMarkdown, onPlaybackStart, onPlaybackEnd, onError]
  );

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

  const toggle = useCallback(async () => {
    if (!playerRef.current) return;

    try {
      await playerRef.current.toggle();
      setPlayerState((prevState) =>
        prevState === "playing" ? "paused" : prevState === "paused" ? "playing" : prevState
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

  return {
    // State
    connectionState,
    playerState,
    isGenerating: playerState === "playing" && connectionState === "ready",
    isPlaying: playerState === "playing",
    isPaused: playerState === "paused",
    isConnected: connectionState === "ready",
    
    // Actions
    speak,
    pause,
    resume,
    toggle,
    stop,
  };
}

export default useCartesiaWithPreferences;

