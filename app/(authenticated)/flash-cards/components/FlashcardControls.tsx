'use client';

import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Shuffle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiAssistModalTab } from '@/types/flashcards.types';
import AudioModal from '../audio/AudioModal';
import AiChatModal from "@/app/(authenticated)/flash-cards/ai/AiChatModal";
import { selectAllFlashcards, selectCurrentIndex, selectActiveFlashcard } from '@/lib/redux/selectors/flashcardSelectors';

interface FlashcardControlsProps {
    onPrevious: () => void;
    onNext: () => void;
    onShuffle: () => void;
    onShowModal: (message: AiAssistModalTab) => void;
    onSelectChange: (value: string) => void;
    firstName: string;
}

const FlashcardControls: React.FC<FlashcardControlsProps> = ({
                                                                 onPrevious,
                                                                 onNext,
                                                                 onShuffle,
                                                                 onShowModal,
                                                                 onSelectChange,
                                                                 firstName,
                                                             }) => {
    const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    const allFlashcards = useSelector(selectAllFlashcards);
    const currentIndex = useSelector(selectCurrentIndex);
    const currentCard = useSelector(selectActiveFlashcard);

    const handleConfusedClick = useCallback(() => {
        setIsAudioModalOpen(true);
    }, []);

    return (
        <div className="w-full flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto flex-1 hover:scale-105 transition-transform">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Previous
                </Button>
                <Button onClick={onNext} variant="outline" className="w-full sm:w-auto flex-1 hover:scale-105 transition-transform">
                    Next <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
                <Button onClick={onShuffle} variant="outline" className="w-full sm:w-auto flex-1 hover:scale-105 transition-transform">
                    <Shuffle className="mr-2 h-4 w-4"/> Shuffle
                </Button>
                <Select onValueChange={onSelectChange} value={currentIndex.toString()}>
                    <SelectTrigger className="w-full sm:w-auto flex-1 hover:scale-105 transition-transform">
                        <SelectValue placeholder="Select a flashcard"/>
                    </SelectTrigger>
                    <SelectContent>
                        {allFlashcards.map((card, index) => (
                            <SelectItem key={card.order} value={index.toString()}>
                                {`${card.order}: ${card.front.length > 50 ? card.front.substring(0, 50) + '...' : card.front}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                <Button
                    onClick={handleConfusedClick}
                    variant="outline"
                    className="w-full hover:scale-105 transition-transform"
                >
                    I'm confused
                </Button>
                <Button
                    onClick={() => onShowModal('example')}
                    variant="outline"
                    className="w-full hover:scale-105 transition-transform"
                >
                    Give me an example
                </Button>
                <Button
                    onClick={() => setIsAiModalOpen(true)}
                    variant="outline"
                    className="w-full hover:scale-105 transition-transform"
                >
                    I have a question
                </Button>
                <Button
                    onClick={() => onShowModal('split')}
                    variant="outline"
                    className="w-full hover:scale-105 transition-transform"
                >
                    Split into two cards
                </Button>
                <Button
                    onClick={() => onShowModal('combine')}
                    variant="outline"
                    className="w-full hover:scale-105 transition-transform"
                >
                    Combine cards
                </Button>
                <Button
                    onClick={() => onShowModal('compare')}
                    variant="outline"
                    className="w-full hover:scale-105 transition-transform"
                >
                    Compare Cards
                </Button>
            </div>

            {currentCard && (
                <>
                    <AudioModal
                        isOpen={isAudioModalOpen}
                        onClose={() => setIsAudioModalOpen(false)}
                        text={currentCard.audioExplanation || ''}
                    />

                    <AiChatModal
                        isOpen={isAiModalOpen}
                        onClose={() => setIsAiModalOpen(false)}
                        firstName={firstName}
                    />
                </>
            )}
        </div>
    );
};

export default FlashcardControls;
