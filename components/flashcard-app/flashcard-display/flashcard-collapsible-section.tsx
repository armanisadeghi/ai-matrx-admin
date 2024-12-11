import {ArmaniCollapsible} from '@/components/matrx/matrx-collapsible/armani-collapsible';
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";

interface FlashcardCollapsibleSectionProps {
    title: string;
    content: string;
    fontSize: number;
    titleFontSize: number;
}

const getTitleFontSizeClass = (size: number) => {
    if (size <= 16) return 'text-base';
    if (size <= 18) return 'text-lg';
    if (size <= 20) return 'text-xl';
    return 'text-2xl';
};

export const FlashcardCollapsibleSection = (
    {
        title,
        content,
        fontSize,
        titleFontSize,
    }: FlashcardCollapsibleSectionProps) => (
    <div onClick={e => e.stopPropagation()}>
        <ArmaniCollapsible
            title={<span className="text-purple-400 font-bold" style={{fontSize: `${titleFontSize}px`}}>
                {title}
            </span>}
            id={title.toLowerCase().replace(/\s+/g, '-')}
            collapsibleToChip={false}
            className="w-full"
            titleFontSize={getTitleFontSizeClass(titleFontSize)}
        >
            <div className="pl-6 text-zinc-100">
                <MarkdownRenderer
                    content={content}
                    type="flashcard"
                    fontSize={fontSize}
                />
            </div>
        </ArmaniCollapsible>
    </div>
);
