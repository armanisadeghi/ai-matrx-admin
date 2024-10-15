'use client';

import React from 'react';
import TextToSpeechPlayer from './TextToSpeechPlayerNew';

const Page: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <TextToSpeechPlayer
                text="Hi. I'm AI Matrix. I'm here to assist you with whatever you need."
                autoPlay={false} // This will start playback automatically, set to false if you want manual play
            />
        </div>
    );
};

export default Page;
