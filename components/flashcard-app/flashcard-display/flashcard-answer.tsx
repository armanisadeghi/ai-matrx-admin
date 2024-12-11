import MarkdownRenderer from "@/app/(authenticated)/flash-cards/ai/MarkdownRenderer";

interface FlashcardAnswerProps {
    content: string;
    fontSize: number;
}

export const FlashcardAnswer = ({ content, fontSize }: FlashcardAnswerProps) => (
    <>
        <MarkdownRenderer
            content={content}
            type="flashcard"
            fontSize={fontSize + 4}
        />
        <div className="w-full border-t border-zinc-700" />
    </>
);
