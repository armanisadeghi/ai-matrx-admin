import React, { useState } from 'react';
import FlashcardDisplay from './FlashcardDisplay';
import AIChatInterface from './AIChatInterface';
import { Flashcard } from '../types';

interface FlashcardWithAIChatProps {
    card: Flashcard;
    onAnswer: (isCorrect: boolean) => void;
}

const FlashcardWithAIChat: React.FC<FlashcardWithAIChatProps> = ({ card, onAnswer }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [fontSize, setFontSize] = useState(16);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleAskQuestion = () => {
        setIsChatOpen(true);
    };

    return (
        <>
            <FlashcardDisplay
                card={card}
                isFlipped={isFlipped}
                fontSize={fontSize}
                onFlip={handleFlip}
                onAnswer={onAnswer}
                onAskQuestion={handleAskQuestion}  // Make sure this line is present
            />
            <AIChatInterface
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                card={card}
            />
        </>
    );
};

export default FlashcardWithAIChat;
