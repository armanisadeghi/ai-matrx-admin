import {Card, CardContent} from "@/components/ui/card";
import {FlashcardAnswer} from "@/components/flashcard-app/flashcard-display/flashcard-answer";
import {FlashcardCollapsibleSection} from "@/components/flashcard-app/flashcard-display/flashcard-collapsible-section";
import {FlashcardFooter} from "@/components/flashcard-app/flashcard-display/flashcard-footer";

interface FlashcardBackProps {
    answer: string;
    detailedExplanation: string;
    example: string;
    dynamicContent?: Array<{ title: string; content: string; }>;
    fontSize: number;
    onAnswer: (correct: boolean) => void;
    onAskQuestion: () => void;
}

export const FlashcardBack = (
    {
        answer,
        detailedExplanation,
        example,
        dynamicContent = [],
        fontSize,
        onAnswer,
        onAskQuestion,
    }: FlashcardBackProps) => (
    <Card
        className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
        <CardContent
            className="flex-grow flex flex-col items-start justify-start p-6 overflow-auto h-[calc(100%-60px)] space-y-4">
            <FlashcardAnswer content={answer} fontSize={fontSize}/>

            <FlashcardCollapsibleSection
                title="Detailed Explanation"
                content={detailedExplanation}
                fontSize={fontSize}
                titleFontSize={fontSize + 2}
            />

            <div className="w-full border-t border-zinc-700"/>

            <FlashcardCollapsibleSection
                title="Example"
                content={example}
                fontSize={fontSize}
                titleFontSize={fontSize + 2}
            />

            {dynamicContent.map(({title, content}, index) => (
                <>
                    <div className="w-full border-t border-zinc-700"/>
                    <FlashcardCollapsibleSection
                        key={index}
                        title={title}
                        content={content}
                        fontSize={fontSize}
                        titleFontSize={fontSize + 2}
                    />
                </>
            ))}
        </CardContent>
        <FlashcardFooter onAnswer={onAnswer} onAskQuestion={onAskQuestion}/>
    </Card>
);
