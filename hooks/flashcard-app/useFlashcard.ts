import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Flashcard, ChatMessage, FlashcardData } from "@/types/flashcards.types";
import { RootState, AppDispatch } from '@/lib/redux/store';
import {
    initializeFlashcards,
    initializeFlashcard,
    addMessage,
    updateFlashcardStats,
    clearChat,
    resetAllChats,
    setCurrentIndex,
    deleteFlashcard,
    addFlashcard,
    updateFlashcard
} from '@/lib/redux/slices/flashcardChatSlice';
import {
    selectAllFlashcards,
    selectActiveFlashcard,
    selectCurrentIndex,
} from '@/lib/redux/selectors/flashcardSelectors';
import {useSwipeable} from "react-swipeable";

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

export const useFlashcard = (initialFlashcards: FlashcardData[]) => {
    const dispatch = useDispatch<AppDispatch>();
    const allFlashcards = useSelector(selectAllFlashcards);
    const currentIndex = useSelector(selectCurrentIndex);
    const activeFlashcard = useSelector(selectActiveFlashcard);
    const firstName = useSelector((state: RootState) => state.user.userMetadata.fullName?.split(' ')[0] || null);

    const [isFlipped, setIsFlipped] = useState(false);
    const [fontSize, setFontSize] = useState(18);
    const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
    const [isExpandedChatOpen, setIsExpandedChatOpen] = useState(false);

    // AI-related state
    const [aiModalState, setAiModalState] = useState<AiModalState>({
        isAudioModalOpen: false,
        isAiModalOpen: false,
        isAiAssistModalOpen: false,
        aiAssistModalMessage: '',
        aiAssistModalDefaultTab: 'confused',
    });

    // Initialize flashcards
    useEffect(() => {
        const flashcardsToInitialize = initialFlashcards.map((card, index) => ({
            ...card,
            id: `flashcard-${index}`,
            reviewCount: 0,
            correctCount: 0,
            incorrectCount: 0,
        }));
        dispatch(initializeFlashcards(flashcardsToInitialize));
    }, [initialFlashcards, dispatch]);

    // AI Modal Actions
    const aiModalActions: AiModalActions = {
        openAudioModal: useCallback(() => {
            setAiModalState(prev => ({ ...prev, isAudioModalOpen: true }));
        }, []),
        closeAudioModal: useCallback(() => {
            setAiModalState(prev => ({ ...prev, isAudioModalOpen: false }));
        }, []),
        openAiModal: useCallback(() => {
            setAiModalState(prev => ({ ...prev, isAiModalOpen: true }));
        }, []),
        closeAiModal: useCallback(() => {
            setAiModalState(prev => ({ ...prev, isAiModalOpen: false }));
        }, []),
        openAiAssistModal: useCallback((message: string) => {
            setAiModalState(prev => ({
                ...prev,
                isAiAssistModalOpen: true,
                aiAssistModalMessage: message,
                aiAssistModalDefaultTab: message.toLowerCase().replace(/\s+/g, '-'),
            }));
        }, []),
        closeAiAssistModal: useCallback(() => {
            setAiModalState(prev => ({ ...prev, isAiAssistModalOpen: false }));
        }, []),
    };

    // Existing functionality
    const handleFlip = useCallback(() => {
        setIsFlipped((prev) => {
            const newValue = !prev;
            console.log(`handleFlip Triggered. Old value: ${prev}, New value: ${newValue}`);
            return newValue;
        });
    }, []);

    const handleNext = useCallback(() => {
        if (currentIndex < allFlashcards.length - 1) {
            dispatch(setCurrentIndex(currentIndex + 1));
            setIsFlipped(false);
        }
    }, [currentIndex, allFlashcards.length, dispatch]);

    const handlePrevious = useCallback(() => {
        if (currentIndex > 0) {
            dispatch(setCurrentIndex(currentIndex - 1));
            setIsFlipped(false);
        }
    }, [currentIndex, dispatch]);

    const handleSelectChange = useCallback((value: string) => {
        dispatch(setCurrentIndex(parseInt(value)));
        setIsFlipped(false);
    }, [dispatch]);

    const shuffleCards = useCallback(() => {
        const newIndex = Math.floor(Math.random() * allFlashcards.length);
        dispatch(setCurrentIndex(newIndex));
        setIsFlipped(false);
    }, [allFlashcards.length, dispatch]);

    const handleAnswer = useCallback((isCorrect: boolean) => {
        if (activeFlashcard) {
            dispatch(updateFlashcardStats({flashcardId: activeFlashcard.id, isCorrect}));
            handleNext();
        }
    }, [activeFlashcard, dispatch, handleNext]);

    const mobileHandlers = useSwipeable({
        onSwipedLeft: handleNext,
        onSwipedRight: handlePrevious,
        preventScrollOnSwipe: true,
        trackMouse: true,
        touchEventOptions: {passive: false}
    });


    const handleAction = useCallback((actionName: string, data: any) => {
        switch (actionName) {
            case 'add':
                dispatch(addFlashcard(data));
                break;
            case 'edit':
                setEditingCard(data);
                break;
            case 'delete':
                dispatch(deleteFlashcard(data.id));
                break;
            case 'expand':
                setIsExpandedChatOpen(true);
                break;
            default:
                console.log(`Unknown action: ${actionName}`);
        }
    }, [dispatch]);

    return {
        // State
        allFlashcards,
        currentIndex,
        activeFlashcard,
        firstName,
        isFlipped,
        fontSize,
        editingCard,
        isExpandedChatOpen,
        aiModalState,

        // Actions
        handleFlip,
        handleNext,
        handlePrevious,
        handleSelectChange,
        shuffleCards,
        handleAnswer,
        setFontSize,
        setIsExpandedChatOpen,
        setEditingCard,
        handleAction,
        aiModalActions,

        // Mobile swipe handlers
        mobileHandlers,

        // Redux actions
        addMessage: useCallback((flashcardId: string, message: ChatMessage) => {
            dispatch(addMessage({ flashcardId, message }));
        }, [dispatch]),
        clearChat: useCallback((flashcardId: string) => {
            dispatch(clearChat(flashcardId));
        }, [dispatch]),
        resetAllChats: useCallback(() => {
            dispatch(resetAllChats());
        }, [dispatch]),
    };
};
