// types.ts
import { ReactNode } from 'react';
import { SwipeableHandlers } from 'react-swipeable';
import { Flashcard, ChatMessage } from "@/types/flashcards.types";

export interface FlashcardContent {
    front: string;
    back: string;
    detailedExplanation: string;
    example: string;
    dynamicContent?: Array<{
        title: string;
        content: string;
    }>;
}

export type AiModalState = {
    isAudioModalOpen: boolean;
    isAiModalOpen: boolean;
    isAiAssistModalOpen: boolean;
    aiAssistModalMessage: string;
    aiAssistModalDefaultTab: string;
};

export type AiModalActions = {
    openAudioModal: () => void;
    closeAudioModal: () => void;
    openAiModal: () => void;
    closeAiModal: () => void;
    openAiAssistModal: (message: string) => void;
    closeAiAssistModal: () => void;
};

export interface FlashcardHook {
    // State
    allFlashcards: Flashcard[];
    currentIndex: number;
    activeFlashcard: (Flashcard & FlashcardContent) | null;
    firstName: string | null;
    isFlipped: boolean;
    fontSize: number;
    editingCard: Flashcard | null;
    isExpandedChatOpen: boolean;
    aiModalState: AiModalState;

    // Actions
    handleFlip: () => void;
    handleNext: () => void;
    handlePrevious: () => void;
    handleSelectChange: (value: string) => void;
    shuffleCards: () => void;
    handleAnswer: (isCorrect: boolean) => void;
    setFontSize: (size: number | ((prev: number) => number)) => void;
    setIsExpandedChatOpen: (isOpen: boolean) => void;
    setEditingCard: (card: Flashcard | null) => void;
    handleAction: (actionName: string, data: any) => void;
    aiModalActions: AiModalActions;

    // Mobile handlers
    mobileHandlers: SwipeableHandlers;

    // Redux actions
    addMessage: (flashcardId: string, message: ChatMessage) => void;
    clearChat: (flashcardId: string) => void;
    resetAllChats: () => void;
}
