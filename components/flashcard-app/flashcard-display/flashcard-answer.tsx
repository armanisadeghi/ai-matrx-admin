import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";

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
