'use client';

import React, { useState } from 'react';

const FlipHorizontalDemo: React.FC = () => {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className={`w-32 h-32 bg-blue-500 flex items-center justify-center text-white font-bold text-lg cursor-pointer transition-transform duration-600 ${
                    isFlipped ? 'rotate-y-180' : ''
                }`}
                onClick={handleFlip}
            >
                Flip Me
            </div>
            <button
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                onClick={handleFlip}
            >
                Toggle Flip
            </button>
        </div>
    );
};

export default FlipHorizontalDemo;
