'use client';
import { useRef, useState } from "react";

export function usePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);

  // Function to initialize the AudioContext with user interaction
  function initializeAudioContext() {
    if (!audioContext.current) {
      try {
        // Create new AudioContext with explicit sample rate
        audioContext.current = new AudioContext({ sampleRate: 24000 });
        console.log("AudioContext initialized successfully");
        setIsAudioContextReady(true);
        return true;
      } catch (error) {
        console.error("Failed to initialize AudioContext:", error);
        return false;
      }
    }
    return true;
  }

  async function play(stream: ReadableStream<Uint8Array>, callback: () => void) {
    // Check if AudioContext is initialized
    if (!audioContext.current) {
      console.error("AudioContext not initialized");
      return;
    }

    // Stop any currently playing audio
    stop();
    
    // Track when the next audio segment should start
    let nextStartTime = audioContext.current.currentTime;
    
    // Get a reader for the stream
    const reader = stream.getReader();
    let leftover = new Uint8Array();
    let result = await reader.read();
    
    setIsPlaying(true);
    console.log("Starting audio playback");

    try {
      while (!result.done && audioContext.current) {
        // Combine leftover data with new chunk
        const data = new Uint8Array(leftover.length + result.value.length);
        data.set(leftover);
        data.set(result.value, leftover.length);
        
        // Ensure we process complete Float32 values (4 bytes each)
        const length = Math.floor(data.length / 4) * 4;
        const remainder = data.length % 4;
        
        // Convert to Float32Array for audio processing
        const buffer = new Float32Array(data.buffer, 0, length / 4);
        leftover = new Uint8Array(data.buffer, length, remainder);
        
        // Create audio buffer from the data
        const audioBuffer = audioContext.current.createBuffer(
          1, // mono channel
          buffer.length,
          audioContext.current.sampleRate
        );
        
        // Copy Float32Array to the audio buffer
        audioBuffer.copyToChannel(buffer, 0);
        
        // Create source node and connect to destination
        source.current = audioContext.current.createBufferSource();
        source.current.buffer = audioBuffer;
        source.current.connect(audioContext.current.destination);
        
        // Schedule playback
        source.current.start(nextStartTime);
        nextStartTime += audioBuffer.duration;
        
        // Read next chunk
        result = await reader.read();
        
        // For the last chunk, set up the callback when it finishes
        if (result.done && source.current) {
          source.current.onended = () => {
            stop();
            callback();
          };
        }
      }
    } catch (error) {
      console.error("Error during audio playback:", error);
      stop();
    }
  }

  function stop() {
    // Stop and clean up the current audio source
    if (source.current) {
      try {
        source.current.stop();
        source.current.disconnect();
      } catch (e) {
        // Source might already be stopped/disconnected
        console.log("Note: Could not stop source, may already be stopped");
      }
      source.current = null;
    }
    
    setIsPlaying(false);
  }

  return {
    isPlaying,
    isAudioContextReady,
    initializeAudioContext,
    play,
    stop,
  };
}