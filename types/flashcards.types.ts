// File location: types/flashcards.types.ts
import { useFlashcard } from '@/hooks/flashcard-app/useFlashcard';

export type FlashcardData = {
    id?: string;
    order: number;
    topic?: string;
    lesson?: string;
    gradeLevel?: number;
    front: string;
    back: string;
    example?: string;
    detailedExplanation?: string;
    audioExplanation?: string;
    relatedImages?: string[];
    personalNotes?: string;
    isDeleted?: boolean;
    dynamicContent?: Array<{ title: string; content: string; }> | undefined;
    tags?: string[];
}

export type Flashcard = FlashcardData & {
    reviewCount: number;
    correctCount: number;
    incorrectCount: number;
}

export type AiAssistModalTab = 'confused' | 'example' | 'question' | 'split' | 'combine' | 'compare';

export type ChatMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export type FlashcardHook = ReturnType<typeof useFlashcard>;


export interface SmartButtonProps {
    flashcardHook: FlashcardHook;
    className?: string;
}

export type TextModalState = {
    isAiModalOpen: boolean;
    isAiAssistModalOpen: boolean;
    aiAssistModalMessage: string;
    aiAssistModalDefaultTab: string;
};

export type AudioModalActions = {
    playActiveCardAudio: () => void;
    playCustomTextAudio: (text: string) => void;
    playIntroAudio: () => void;
    playOutroAudio: () => void;
};

export type TextModalActions = {
    openAiModal: () => void;
    closeAiModal: () => void;
    openAiAssistModal: (message: string) => void;
    closeAiAssistModal: () => void;
};

