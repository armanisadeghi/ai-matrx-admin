'use client'

import React from 'react';
import FlashcardComponent from './components/FlashcardComponent';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'] });

const FlashcardsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <h3 className={`text-3xl font-bold mb-6 text-primary ${playfair.className}`}>
        Flashcard Learning
      </h3>
      <FlashcardComponent />
    </div>
  );
};

export default FlashcardsPage;