'use client';

import React from 'react';
import TextToSpeechPlayer from '../TextToSpeechPlayer';

const Page: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold mb-4">TTS Test One</h1>

            <TextToSpeechPlayer
                text="Hi. I'm AI Matrix. I'm here to assist you with whatever you need."
                autoPlay={true} // This will start playback automatically, set to false if you want manual play
            />
        </div>
    );
};

export default Page;
