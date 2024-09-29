'use client'

import React from 'react';
import FlashcardComponent from './components/FlashcardComponent';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'] });

const FlashcardsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <h3 className={`
        ${playfair.className}
        text-4xl font-bold mb-8
        tracking-wide
        text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500
        drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]
        animate-pulse
      `}>
        Flashcard Learning
      </h3>
      <FlashcardComponent />
    </div>
  );
};

export default FlashcardsPage;