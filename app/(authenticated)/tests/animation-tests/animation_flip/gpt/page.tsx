'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function FlipCard() {
    const [flipped, setFlipped] = useState(false);

    const toggleFlip = () => {
        setFlipped(!flipped);
    };

    return (
        <div className="flex h-screen justify-center items-center">
            {/* Container for the card */}
            <div className="relative w-64 h-64">
                <motion.article
                    onClick={toggleFlip}
                    className={`cursor-pointer relative w-full h-full border border-gray-200 dark:border-gray-700 bg-white/10 dark:bg-gray-800 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-500 ${
                        flipped ? 'rotate-y-180' : ''
                    }`}
                    style={{
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/* Front side */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 backface-hidden"
                        style={{
                            transform: 'rotateY(0deg)',
                        }}
                    >
                        <span className="flex h-16 w-16 items-center justify-center rounded-md bg-zinc-600"></span>
                        <p className="text-sm font-semibold opacity-80">flip-horizontal</p>
                    </div>

                    {/* Back side */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 backface-hidden bg-zinc-500"
                        style={{
                            transform: 'rotateY(180deg)',
                        }}
                    >
                        <span className="text-white">Back Side Content</span>
                    </div>
                </motion.article>
                <button
                    aria-label="Copy flip horizontal animation"
                    className="absolute right-2 top-2"
                >
                    <svg
                        width="16"
                        height="16"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                        fill="none"
                    >
                        <path
                            d="M19.4 20H9.6C9.26863 20 9 19.7314 9 19.4V9.6C9 9.26863 9.26863 9 9.6 9H19.4C19.7314 9 20 9.26863 20 9.6V19.4C20 19.7314 19.7314 20 19.4 20Z"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M15 9V4.6C15 4.26863 14.7314 4 14.4 4H4.6C4.26863 4 4 4.26863 4 4.6V14.4C4 14.7314 4.26863 15 4.6 15H9"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}
