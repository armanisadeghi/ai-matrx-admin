'use client';
import { usePlayer } from './usePlayer';
import { useState } from 'react';

// Create a more natural speech-like audio stream
function createSpeechLikeAudioStream(): ReadableStream<Uint8Array> {
  // Create a more complex waveform that sounds like speech
  const sampleRate = 24000;
  const duration = 3; // 3 seconds of audio
  const totalSamples = sampleRate * duration;
  const audioData = new Float32Array(totalSamples);
  
  // Generate a more speech-like waveform
  for (let i = 0; i < totalSamples; i++) {
    // Base frequency changes over time (like speech)
    const time = i / sampleRate;
    const baseFreq = 150 + 50 * Math.sin(2 * Math.PI * 0.5 * time);
    
    // Add some harmonics
    audioData[i] = 
      0.5 * Math.sin(2 * Math.PI * baseFreq * time) + 
      0.25 * Math.sin(2 * Math.PI * baseFreq * 2 * time) +
      0.125 * Math.sin(2 * Math.PI * baseFreq * 3 * time);
    
    // Add amplitude modulation (like words)
    audioData[i] *= 0.7 + 0.3 * Math.sin(2 * Math.PI * 2.5 * time);
    
    // Add some noise reduction at the beginning and end
    const fadeIn = Math.min(1, i / (sampleRate * 0.1));
    const fadeOut = Math.min(1, (totalSamples - i) / (sampleRate * 0.1));
    audioData[i] *= fadeIn * fadeOut;
  }
  
  // Convert to bytes for the stream
  const audioBytes = new Uint8Array(audioData.buffer);
  
  // Stream in chunks
  const chunkSize = 4800; // 0.2 seconds per chunk at 24kHz
  let offset = 0;
  
  return new ReadableStream({
    pull(controller) {
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
        }, 100);
      });
    }
  });
}

export function SimpleAudioPlayer() {
  const { isPlaying, isAudioContextReady, initializeAudioContext, play, stop } = usePlayer();
  const [playCount, setPlayCount] = useState(0);

  const handlePlayAudio = async () => {
    try {
      const stream = createSpeechLikeAudioStream();
      setPlayCount(prev => prev + 1);
      
      await play(stream, () => {
        console.log('Audio playback completed');
      });
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };
  
  return (
    <div className="p-4 rounded-lg bg-white text-black dark:bg-gray-800 dark:text-white shadow-md">
      <h2 className="text-lg font-medium mb-4">Audio Context Test</h2>
      
      <div className="space-y-4">
        {!isAudioContextReady && (
          <button 
            onClick={initializeAudioContext}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md"
          >
            Initialize Audio Context
          </button>
        )}
        
        {isAudioContextReady && (
          <div className="space-y-4">
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              ✓ Audio context initialized successfully
            </div>
            
            <button 
              onClick={handlePlayAudio}
              disabled={isPlaying}
              className={`w-full py-2 rounded-md ${
                isPlaying 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600'
              }`}
            >
              {isPlaying ? 'Playing...' : 'Play Test Sound'}
            </button>
            
            {isPlaying && (
              <button 
                onClick={stop}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600 rounded-md"
              >
                Stop
              </button>
            )}
            
            {playCount > 0 && (
              <div className="text-sm">
                Test sound played {playCount} time{playCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}