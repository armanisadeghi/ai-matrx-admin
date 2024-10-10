import React from 'react';
import {Card, CardContent, CardFooter} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {CheckCircle, XCircle, MessageSquare} from 'lucide-react';
import MarkdownRenderer from "@/app/(authenticated)/flash-cards/ai/MarkdownRenderer";
import {useFlashcard} from "@/app/(authenticated)/flash-cards/hooks/useFlashcard";
import {cn} from "@/utils/cn";

const FlashcardDisplay: React.FC = (    {    }) => {
    const {
        activeFlashcard,
        isFlipped,
        fontSize,
        handleFlip,
        handleAnswer,
        handleAskQuestion,
    } = useFlashcard();

    const frontFontSize = fontSize + 10;

    if (!activeFlashcard) {
        return <div>No card data available</div>;
    }

    return (
        <div className="w-full min-h-[400px] lg:h-full [perspective:1000px]">
            <div
                className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${
                    isFlipped ? "[transform:rotateY(180deg)]" : ""
                }`}
                onClick={handleFlip}
            >
                {/* Front of card */}
                <Card
                    className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                    <CardContent className="flex-grow flex items-center justify-center p-6 overflow-auto h-full">
                        <p className="text-center text-white" style={{fontSize: `${frontFontSize}px`}}>
                            {activeFlashcard.front}
                        </p>
                    </CardContent>
                </Card>
                {/* Back of card */}
                <Card
                    className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
                    <CardContent className="flex-grow flex flex-col items-start justify-start p-6 overflow-auto h-[calc(100%-60px)]">
                        <MarkdownRenderer content={activeFlashcard.back} type="flashcard" fontSize={fontSize} />
                        <div className="w-full border-t border-zinc-700 my-2"></div>
                        <div className={cn('text-left', 'text-blue-400')} style={{ fontSize: `${fontSize}px` }}>
                            <span className="font-bold">Example:</span>
                            <MarkdownRenderer
                                content={activeFlashcard.example}
                                type="flashcard"
                                fontSize={fontSize}
                                className="inline text-blue-400"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between p-2 absolute bottom-0 left-0 right-0">
                        <Button onClick={(e) => {
                            e.stopPropagation();
                            handleAnswer(false);
                        }} variant="destructive">
                            <XCircle className="mr-2 h-4 w-4"/> Incorrect
                        </Button>
                        <Button onClick={(e) => {
                            e.stopPropagation();
                            handleAskQuestion();
                        }} variant="secondary">
                            <MessageSquare className="mr-2 h-4 w-4"/> Ask a Question
                        </Button>
                        <Button onClick={(e) => {
                            e.stopPropagation();
                            handleAnswer(true);
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
