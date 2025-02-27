'use client';

import { useCartesia } from "@/hooks/tts/useCartesia";

export default function AudioPlayer() {
    const {
      sendMessage, 
      isAudioInitialized,
      initializeAudio,
      resumePlayback
    } = useCartesia();
  
    return (
      <div>
        {!isAudioInitialized && (
          <button 
            onClick={async () => {
              try {
                await initializeAudio();
                console.log("Audio initialized successfully");
              } catch (err) {
                console.error("Failed to initialize audio:", err);
              }
            }} 
            className="primary-button"
          >
            Initialize Audio
          </button>
        )}
        
        <button 
          onClick={() => sendMessage("Hello world")}
          disabled={!isAudioInitialized}
        >
          Play Audio
        </button>
        
        <button 
          onClick={async () => {
            try {
              await resumePlayback();
            } catch (err) {
              console.error("Resume error:", err);
            }
          }}
          disabled={!isAudioInitialized}
        >
          Resume
        </button>
      </div>
    );
  }