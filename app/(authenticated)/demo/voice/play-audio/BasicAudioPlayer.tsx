'use client';
import { usePlayer } from './usePlayer';
import { useState } from 'react';

// Utility function to simulate a text-to-speech stream
function createMockAudioStream(): ReadableStream<Uint8Array> {
  // Create a simple sine wave to simulate audio
  const sampleRate = 24000;
  const duration = 5; // 5 seconds of audio
  const frequency = 440; // A4 note
  
  // Create the entire audio buffer first
  const totalSamples = sampleRate * duration;
  const audioData = new Float32Array(totalSamples);
  
  // Generate a simple sine wave
  for (let i = 0; i < totalSamples; i++) {
    audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
  }
  
  // Convert to bytes for the stream
  const audioBytes = new Uint8Array(audioData.buffer);
  
  // Create chunks to simulate streaming
  const chunkSize = 4096; // Bytes per chunk
  let offset = 0;
  
  return new ReadableStream({
    pull(controller) {
      // Simulate network delay
      return new Promise(resolve => {
        setTimeout(() => {
          if (offset >= audioBytes.length) {
            controller.close();
            resolve();
            return;
          }
          
          const end = Math.min(offset + chunkSize, audioBytes.length);
          const chunk = audioBytes.slice(offset, end);
          controller.enqueue(chunk);
          offset = end;
          resolve();
        }, 100); // Small delay to simulate network
      });
    }
  });
}

export function AudioPlayer() {
  const { isPlaying, isAudioContextReady, initializeAudioContext, play, stop } = usePlayer();
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState("Hello, this is a test of the audio player.");
  
  // Function to handle audio playback
  const handlePlayAudio = async () => {
    setIsProcessing(true);
    
    try {
      // Create a mock TTS audio stream
      const stream = createMockAudioStream();
      
      // Play the audio stream
      await play(stream, () => {
        console.log('Audio playback completed');
        setIsProcessing(false);
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="p-6 max-w-md mx-auto rounded-xl shadow-md bg-white dark:bg-gray-800 flex flex-col gap-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Audio Player Test</h2>
      
      <div className="flex flex-col gap-2">
        <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Text to speak
        </label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows={3}
        />
      </div>
      
      <div className="flex flex-col gap-3">
        {!isAudioContextReady && (
          <button 
            onClick={initializeAudioContext}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors duration-200 flex items-center justify-center"
          >
            <span>Initialize Audio Context</span>
            <span className="ml-2 text-xs">(required for browser audio)</span>
          </button>
        )}
        
        {isAudioContextReady && !isPlaying && (
          <button 
            onClick={handlePlayAudio}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-md transition-colors duration-200 flex items-center justify-center ${
              isProcessing 
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Play Audio'}
          </button>
        )}
        
        {isPlaying && (
          <button 
            onClick={stop}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors duration-200"
          >
            Stop Audio
          </button>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Status: {
          !isAudioContextReady 
            ? 'Audio context not initialized' 
            : isPlaying 
              ? 'Playing audio...' 
              : isProcessing 
                ? 'Processing...' 
                : 'Ready to play'
        }</p>
      </div>
    </div>
  );
}