import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';

interface FlashcardFooterProps {
    onAnswer: (correct: boolean) => void;
    onAskQuestion: () => void;
}

export const FlashcardFooter = ({ onAnswer, onAskQuestion }: FlashcardFooterProps) => (
    <CardFooter className="flex justify-between p-2 absolute bottom-0 left-0 right-0">
        <Button
            onClick={(e) => {
                e.stopPropagation();
                onAnswer(false);
            }}
            variant="destructive"
            className="sm:px-4 px-2 text-sm sm:text-base"
        >
            <XCircle className="sm:mr-2 mr-0 h-4 w-4 sm:flex hidden"/>
            <XCircle className="h-4 w-4 sm:hidden flex"/>
            <span className="sm:inline hidden">Incorrect</span>
        </Button>
        <Button
            onClick={(e) => {
                e.stopPropagation();
                onAskQuestion();
            }}
            variant="secondary"
            className="sm:px-4 px-2 text-sm sm:text-base"
        >
            <MessageSquare className="sm:mr-2 mr-0 h-4 w-4 sm:flex hidden"/>
            <MessageSquare className="h-4 w-4 sm:hidden flex"/>
            <span className="sm:inline hidden">Ask a Question</span>
        </Button>
        <Button
            onClick={(e) => {
                e.stopPropagation();
                onAnswer(true);
            }}
            variant="default"
            className="bg-primary hover:bg-green-700 sm:px-4 px-2 text-sm sm:text-base"
        >
            <CheckCircle className="sm:mr-2 mr-0 h-4 w-4 sm:flex hidden"/>
            <CheckCircle className="h-4 w-4 sm:hidden flex"/>
            <span className="sm:inline hidden">Correct</span>
        </Button>
    </CardFooter>
);
