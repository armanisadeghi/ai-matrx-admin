import { useFlashcard } from '@/hooks/flashcard-app/useFlashcard';

export type FlashcardHook = ReturnType<typeof useFlashcard>;


export interface SmartButtonProps {
    flashcardHook: FlashcardHook;
    className?: string;
}

