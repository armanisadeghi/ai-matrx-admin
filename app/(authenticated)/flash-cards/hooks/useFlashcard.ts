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

export const useFlashcard = (initialFlashcards: FlashcardData[]) => {
    const dispatch = useDispatch<AppDispatch>();
    const allFlashcards = useSelector(selectAllFlashcards);
    const currentIndex = useSelector(selectCurrentIndex);
    const activeFlashcard = useSelector(selectActiveFlashcard);
    const firstName = useSelector((state: RootState) => state.user.userMetadata.fullName?.split(' ')[0] || null);

    const [isFlipped, setIsFlipped] = useState(false);
    const [fontSize, setFontSize] = useState(18);
    const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalDefaultTab, setModalDefaultTab] = useState('confused');
    const [isExpandedChatOpen, setIsExpandedChatOpen] = useState(false);

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

    const handleFlip = useCallback(() => setIsFlipped(prev => !prev), []);

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

    const handleEditCard = useCallback((card: Flashcard) => {
        setEditingCard(card);
    }, []);

    const handleSaveEdit = useCallback(() => {
        if (editingCard) {
            dispatch(updateFlashcard(editingCard));
            setEditingCard(null);
        }
    }, [editingCard, dispatch]);

    const showModal = useCallback((message: string) => {
        setModalMessage(message);
        setModalDefaultTab(message.toLowerCase().replace(/\s+/g, '-'));
        setIsModalOpen(true);
    }, []);

    const handleAskQuestion = useCallback(() => {
        setIsExpandedChatOpen(true);
    }, []);

    const handleAddMessage = useCallback((flashcardId: string, message: ChatMessage) => {
        dispatch(addMessage({ flashcardId, message }));
    }, [dispatch]);

    const handleClearChat = useCallback((flashcardId: string) => {
        dispatch(clearChat(flashcardId));
    }, [dispatch]);

    const handleResetAllChats = useCallback(() => {
        dispatch(resetAllChats());
    }, [dispatch]);

    const handleDeleteFlashcard = useCallback((flashcardId: string) => {
        dispatch(deleteFlashcard(flashcardId));
    }, [dispatch]);

    const handleAddFlashcard = useCallback((flashcard: Flashcard) => {
        dispatch(addFlashcard(flashcard));
    }, [dispatch]);

    const handleAction = useCallback((actionName: string, data: any) => {
        switch (actionName) {
            case 'add':
                handleAddFlashcard(data);
                break;
            case 'edit':
                handleEditCard(data);
                break;
            case 'delete':
                handleDeleteFlashcard(data.id);
                break;
            case 'expand':
                setIsExpandedChatOpen(true);
                break;
            default:
                console.log(`Unknown action: ${actionName}`);
        }
    }, [handleAddFlashcard, handleEditCard, handleDeleteFlashcard]);

    return {
        allFlashcards,
        currentIndex,
        activeFlashcard,
        firstName,
        isFlipped,
        fontSize,
        editingCard,
        isModalOpen,
        modalMessage,
        modalDefaultTab,
        isExpandedChatOpen,
        handleFlip,
        handleNext,
        handlePrevious,
        handleSelectChange,
        shuffleCards,
        handleAnswer,
        handleEditCard,
        handleSaveEdit,
        showModal,
        handleAskQuestion,
        setFontSize,
        setIsModalOpen,
        setIsExpandedChatOpen,
        setEditingCard,
        handleAction,
        handleAddMessage,
        handleClearChat,
        handleResetAllChats,
        handleDeleteFlashcard,
        handleAddFlashcard,
    };
};
