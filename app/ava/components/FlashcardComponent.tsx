import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { vocabFlashcards } from '../lesson-data';
import { Flashcard, FlashcardData } from "@/types/flashcards.types";
import FlashcardControls from './FlashcardControls';
import FlashcardDisplay from './FlashcardDisplay';
import PerformanceChart from './PerformanceChart';
import FlashcardTable from './FlashcardTable';
import EditFlashcardDialog from './EditFlashcardDialog';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import AiAssistModal from './AiAssistModal';

const FlashcardComponent: React.FC = () => {
    const [cards, setCards] = useState<Flashcard[]>(
        vocabFlashcards.map(card => ({
            ...card,
            reviewCount: 0,
            correctCount: 0,
            incorrectCount: 0
        }))
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fontSize, setFontSize] = useState(16);
    const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalDefaultTab, setModalDefaultTab] = useState('confused');
    const { theme } = useTheme();

    const totalCorrect = useMemo(() => cards.reduce((sum, card) => sum + card.correctCount, 0), [cards]);
    const totalIncorrect = useMemo(() => cards.reduce((sum, card) => sum + card.incorrectCount, 0), [cards]);

    useEffect(() => {
        setProgress((currentIndex / (cards.length - 1)) * 100);
    }, [currentIndex, cards.length]);

    const handleFlip = () => setIsFlipped(!isFlipped);

    const handleNext = () => {
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsFlipped(false);
        }
    };

    const handleSelectChange = (value: string) => {
        setCurrentIndex(parseInt(value));
        setIsFlipped(false);
    };

    const shuffleCards = () => {
        setCards([...cards].sort(() => Math.random() - 0.5));
        setCurrentIndex(0);
        setIsFlipped(false);
    };

    const handleAnswer = (isCorrect: boolean) => {
        setCards(prevCards =>
            prevCards.map((card, index) =>
                index === currentIndex
                    ? {
                        ...card,
                        reviewCount: card.reviewCount + 1,
                        correctCount: isCorrect ? card.correctCount + 1 : card.correctCount,
                        incorrectCount: isCorrect ? card.incorrectCount : card.incorrectCount + 1
                    }
                    : card
            )
        );
        handleNext();
    };

    const handleEditCard = (card: Flashcard) => {
        setEditingCard(card);
    };

    const handleSaveEdit = () => {
        if (editingCard) {
            setCards(prevCards =>
                prevCards.map(card =>
                    card.order === editingCard.order ? editingCard : card
                )
            );
            setEditingCard(null);
        }
    };

    const showModal = (message: string) => {
        setModalMessage(message);
        setModalDefaultTab(message.toLowerCase().replace(/\s+/g, '-'));
        setIsModalOpen(true);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-stretch mb-4 gap-4">
                <div className="w-2/3">
                    <FlashcardDisplay
                        card={cards[currentIndex]}
                        isFlipped={isFlipped}
                        fontSize={fontSize}
                        onFlip={handleFlip}
                        onAnswer={handleAnswer}
                    />
                </div>
                <div className="w-1/3">
                    <PerformanceChart
                        totalCorrect={totalCorrect}
                        totalIncorrect={totalIncorrect}
                    />
                </div>
            </div>

            <FlashcardControls
                onPrevious={handlePrevious}
                onNext={handleNext}
                onShuffle={shuffleCards}
                onShowModal={showModal}
                onSelectChange={handleSelectChange}
                currentIndex={currentIndex}
                cards={cards}
            />

            <div className="mt-4">
                <Progress value={progress} className="w-full" />
            </div>

            <div className="mt-4 flex items-center space-x-2">
                <span>Font Size:</span>
                <Button onClick={() => setFontSize(prev => Math.max(12, prev - 2))} variant="outline">-</Button>
                <span>{fontSize}px</span>
                <Button onClick={() => setFontSize(prev => Math.min(36, prev + 2))} variant="outline">+</Button>
            </div>

            <FlashcardTable
                cards={cards}
                onEditCard={handleEditCard}
                onSelectCard={(index) => { setCurrentIndex(index); setIsFlipped(false); }}
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
        </div>
    );
};

export default FlashcardComponent;
