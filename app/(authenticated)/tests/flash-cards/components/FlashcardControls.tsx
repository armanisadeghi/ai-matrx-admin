import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Shuffle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flashcard, AiAssistModalTab } from '../types';

interface FlashcardControlsProps {
    onPrevious: () => void;
    onNext: () => void;
    onShuffle: () => void;
    onShowModal: (message: AiAssistModalTab) => void;
    onSelectChange: (value: string) => void;
    currentIndex: number;
    cards: Flashcard[];
}

const FlashcardControls: React.FC<FlashcardControlsProps> = ({
    onPrevious,
    onNext,
    onShuffle,
    onShowModal,
    onSelectChange,
    currentIndex,
    cards
}) => {
    return (
        <div className="w-full flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
                <Button onClick={onPrevious} variant="outline" className="flex-1 hover:scale-105 transition-transform">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button onClick={onNext} variant="outline" className="flex-1 hover:scale-105 transition-transform">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button onClick={onShuffle} variant="outline" className="flex-1 hover:scale-105 transition-transform">
                    <Shuffle className="mr-2 h-4 w-4" /> Shuffle
                </Button>
                <Select onValueChange={onSelectChange} value={currentIndex.toString()}>
                    <SelectTrigger className="flex-1 hover:scale-105 transition-transform">
                        <SelectValue placeholder="Select a flashcard" />
                    </SelectTrigger>
                    <SelectContent>
                        {cards.map((card, index) => (
                            <SelectItem key={card.order} value={index.toString()}>
                                {`${card.order}: ${card.front.length > 50 ? card.front.substring(0, 50) + '...' : card.front}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                <Button onClick={() => onShowModal('confused')} variant="outline" className="w-full hover:scale-105 transition-transform">I'm confused</Button>
                <Button onClick={() => onShowModal('example')} variant="outline" className="w-full hover:scale-105 transition-transform">Give me an example</Button>
                <Button onClick={() => onShowModal('question')} variant="outline" className="w-full hover:scale-105 transition-transform">I have a question</Button>
                <Button onClick={() => onShowModal('split')} variant="outline" className="w-full hover:scale-105 transition-transform">Split into two cards</Button>
                <Button onClick={() => onShowModal('combine')} variant="outline" className="w-full hover:scale-105 transition-transform">Combine cards</Button>
                <Button onClick={() => onShowModal('compare')} variant="outline" className="w-full hover:scale-105 transition-transform">Compare Cards</Button>
            </div>
        </div>
    );
};

export default FlashcardControls;