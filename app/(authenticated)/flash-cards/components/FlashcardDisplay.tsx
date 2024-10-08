import React from 'react';
import {useSelector} from 'react-redux';
import {Card, CardContent, CardFooter} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {CheckCircle, XCircle, MessageSquare} from 'lucide-react';
import {selectActiveFlashcard} from '@/lib/redux/selectors/flashcardSelectors';

interface FlashcardDisplayProps {
    isFlipped: boolean;
    fontSize: number;
    onFlip: () => void;
    onAnswer: (isCorrect: boolean) => void;
    onAskQuestion: () => void;
}

const FlashcardDisplay: React.FC<FlashcardDisplayProps> = (
    {
        isFlipped,
        fontSize,
        onFlip,
        onAnswer,
        onAskQuestion
    }) => {
    const card = useSelector(selectActiveFlashcard);

    if (!card) {
        return <div>No card data available</div>;
    }

    return (
        <div className="w-full min-h-[400px] lg:h-full [perspective:1000px]">
            <div
                className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${
                    isFlipped ? "[transform:rotateY(180deg)]" : ""
                }`}
                onClick={onFlip}
            >
                {/* Front of card */}
                <Card
                    className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                    <CardContent className="flex-grow flex items-center justify-center p-6 overflow-auto h-full">
                        <p className="text-center text-white" style={{fontSize: `${fontSize}px`}}>
                            {card.front}
                        </p>
                    </CardContent>
                </Card>
                {/* Back of card */}
                <Card
                    className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                    <CardContent
                        className="flex-grow flex flex-col items-start justify-start p-6 overflow-auto h-[calc(100%-60px)]">
                        <p className="text-left mb-4 text-white" style={{fontSize: `${fontSize}px`}}>
                            {card.back}
                        </p>
                        <div className="w-full border-t border-zinc-700 my-2"></div>
                        <p className="text-left text-blue-400" style={{fontSize: `${fontSize}px`}}>
                            Example: {card.example}
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-between p-2 absolute bottom-0 left-0 right-0">
                        <Button onClick={(e) => {
                            e.stopPropagation();
                            onAnswer(false);
                        }} variant="destructive">
                            <XCircle className="mr-2 h-4 w-4"/> Incorrect
                        </Button>
                        <Button onClick={(e) => {
                            e.stopPropagation();
                            onAskQuestion();
                        }} variant="secondary">
                            <MessageSquare className="mr-2 h-4 w-4"/> Ask a Question
                        </Button>
                        <Button onClick={(e) => {
                            e.stopPropagation();
                            onAnswer(true);
                        }} variant="default" className="bg-primary hover:bg-green-700">
                            <CheckCircle className="mr-2 h-4 w-4"/> Correct
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default FlashcardDisplay;
