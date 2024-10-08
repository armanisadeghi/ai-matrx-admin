// File location: app\(authenticated)\tests\flash-cards\hold-hold-page.tsx

'use client'

import React from 'react';
import FlashcardComponent from './components/FlashcardComponent';
import {Cover} from "@/components/ui";

const FlashcardsPage: React.FC = () => {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <h1 className="text-4xl md:text-4xl lg:text-6xl font-semibold w-full text-center py-6 bg-clip-text text-transparent bg-gradient-to-b from-neutral-800 via-neutral-700 to-neutral-700 dark:from-neutral-800 dark:via-white dark:to-white">
                History <Cover>Flashcards</Cover>
            </h1>
            <div className="flex-grow overflow-auto p-4">
                <FlashcardComponent/>
            </div>
        </div>
    );
};

export default FlashcardsPage;
