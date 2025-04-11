'use client';
import React, { useState, useEffect } from 'react';
import TextToSpeechPlayer from '../TextToSpeechPlayerThree';

const Page: React.FC = () => {
    // Add state to track if we're on the client side
    const [isClient, setIsClient] = useState(false);
    
    // This effect will only run in the browser after component mounts
    useEffect(() => {
        setIsClient(true);
    }, []);
    
    return (
        <div className="w-full h-full">
            <h1 className="text-2xl font-bold mb-4">TTS Test Three</h1>
            {/* Only render the TextToSpeechPlayer when on client side */}
            {isClient && (
                <TextToSpeechPlayer
                    text="Hi. I'm AI Matrix. I'm here to assist you with whatever you need."
                    autoPlay={false}
                />
            )}
        </div>
    );
};

export default Page;