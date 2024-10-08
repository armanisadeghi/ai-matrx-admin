'use client';

import React, {useState} from 'react';
import {useTheme} from 'next-themes';
import {useSelector, useDispatch} from 'react-redux';
import {flashcardDataSet} from '../lesson-data';
import {Flashcard} from "@/types/flashcards.types";
import FlashcardControls from './FlashcardControls';
import FlashcardDisplay from './FlashcardDisplay';
// import ExpandedFlashcardWithChat from '../ai/ExpandedFlashcardWithChat';
import PerformanceChart from './PerformanceChart';
import FlashcardTable from './FlashcardTable';
import EditFlashcardDialog from './EditFlashcardDialog';
import {Button} from "@/components/ui/button";
import {Progress} from "@/components/ui/progress";
import AiAssistModal from '../ai/AiAssistModal';
import {RootState, AppDispatch} from '@/lib/redux/store';
import {
    initializeFlashcards,
    setCurrentIndex,
    updateFlashcard,
    updateFlashcardStats
} from '@/lib/redux/slices/flashcardChatSlice';

import {
    selectAllFlashcards,
    selectActiveFlashcard,
    selectCurrentIndex,
} from '@/lib/redux/selectors/flashcardSelectors';

const FlashcardComponent: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const allFlashcards = useSelector(selectAllFlashcards);
    const currentIndex = useSelector(selectCurrentIndex);
    const activeFlashcard = useSelector(selectActiveFlashcard);
    const firstName = useSelector((state: RootState) => state.user.userMetadata.fullName?.split(' ')[0] || null);

    const [isFlipped, setIsFlipped] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalDefaultTab, setModalDefaultTab] = useState('confused');
    const {theme} = useTheme();
    const [isExpandedChatOpen, setIsExpandedChatOpen] = useState(false);

    React.useEffect(() => {
        const flashcardsToInitialize = flashcardDataSet.map((card, index) => ({
            ...card,
            id: `flashcard-${index}`,
            reviewCount: 0,
            correctCount: 0,
            incorrectCount: 0
        }));
        dispatch(initializeFlashcards(flashcardsToInitialize));
    }, [dispatch]);

    React.useEffect(() => {
        const progress = ((currentIndex + 1) / allFlashcards.length) * 100;
    }, [currentIndex, allFlashcards.length]);

    const handleFlip = () => setIsFlipped(!isFlipped);

    const handleNext = () => {
        if (currentIndex < allFlashcards.length - 1) {
            dispatch(setCurrentIndex(currentIndex + 1));
            setIsFlipped(false);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            dispatch(setCurrentIndex(currentIndex - 1));
            setIsFlipped(false);
        }
    };

    const handleSelectChange = (value: string) => {
        dispatch(setCurrentIndex(parseInt(value)));
        setIsFlipped(false);
    };

    const shuffleCards = () => {
        const newIndex = Math.floor(Math.random() * allFlashcards.length);
        dispatch(setCurrentIndex(newIndex));
        setIsFlipped(false);
    };

    const handleAnswer = (isCorrect: boolean) => {
        if (activeFlashcard) {
            dispatch(updateFlashcardStats({flashcardId: activeFlashcard.id, isCorrect}));
            handleNext();
        }
    };

    const handleEditCard = (card: Flashcard) => {
        setEditingCard(card);
    };

    const handleSaveEdit = () => {
        if (editingCard) {
            dispatch(updateFlashcard(editingCard));
            setEditingCard(null);
        }
    };

    const showModal = (message: string) => {
        setModalMessage(message);
        setModalDefaultTab(message.toLowerCase().replace(/\s+/g, '-'));
        setIsModalOpen(true);
    };

    const handleAskQuestion = () => {
        setIsExpandedChatOpen(true);
    };

        return (
            <div className="w-full">
                <div className="flex flex-col lg:flex-row justify-between items-stretch mb-4 gap-4">
                    <div className="w-full lg:w-2/3 flex">
                        <FlashcardDisplay
                            isFlipped={isFlipped}
                            fontSize={fontSize}
                            onFlip={handleFlip}
                            onAnswer={handleAnswer}
                            onAskQuestion={handleAskQuestion}
                        />
                    </div>
                    <div className="w-full lg:w-1/3 flex">
                        <PerformanceChart/>
                    </div>
                </div>

                <FlashcardControls
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onShuffle={shuffleCards}
                    onShowModal={showModal}
                    onSelectChange={handleSelectChange}
                    firstName={firstName}
                />

                <div className="mt-4">
                    <Progress value={((currentIndex + 1) / allFlashcards.length) * 100} className="w-full"/>
                </div>

                <div className="mt-4 flex items-center space-x-2">
                    <span>Font Size:</span>
                    <Button onClick={() => setFontSize(prev => Math.max(12, prev - 2))} variant="outline">-</Button>
                    <span>{fontSize}px</span>
                    <Button onClick={() => setFontSize(prev => Math.min(36, prev + 2))} variant="outline">+</Button>
                </div>

                <FlashcardTable
                    onEditCard={handleEditCard}
                />

                <EditFlashcardDialog
                    editingCard={editingCard}
                    onSave={handleSaveEdit}
                    onClose={() => setEditingCard(null)}
                />

                <AiAssistModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    defaultTab={modalDefaultTab}
                    message={modalMessage}
                />
                {/*{activeFlashcard && (*/}
                {/*    <ExpandedFlashcardWithChat*/}
                {/*        isOpen={isExpandedChatOpen}*/}
                {/*        onClose={() => setIsExpandedChatOpen(false)}*/}
                {/*        cardId={activeFlashcard.id}*/}
                {/*        firstName={firstName}*/}
                {/*        fontSize={fontSize}*/}
                {/*    />*/}
                {/*)}*/}
            </div>
        );
};

export default FlashcardComponent;
