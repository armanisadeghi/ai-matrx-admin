'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { NoteActionButtons } from '../shared/buttons/ActionButton';

interface PlainTextAreaProps {
    className?: string;
    placeholder?: string;
    disableResize?: boolean;
}

const PlainTextArea = ({
    className,
    placeholder = 'Start typing...',
    disableResize = true,
}: PlainTextAreaProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { currentNote, handleNoteChange } = useNotesManager();

    // Local state for immediate updates while typing
    const [localContent, setLocalContent] = useState('');
    const isTypingRef = useRef(false);

    // CRITICAL FIX: Only sync when note ID changes, NOT on every content update
    useEffect(() => {
        // Only update if we're not actively typing
        if (!isTypingRef.current) {
            setLocalContent(currentNote?.content || '');
        }
    }, [currentNote?.id]); // Only depend on ID, not content!

    // Reset local content when switching notes
    useEffect(() => {
        setLocalContent(currentNote?.content || '');
        isTypingRef.current = false;
    }, [currentNote?.id]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        isTypingRef.current = true;
        setLocalContent(newContent); // Update local state immediately
        handleNoteChange({ content: newContent }); // Debounced save
        
        // Reset typing flag after a delay
        setTimeout(() => {
            isTypingRef.current = false;
        }, 1500);
    };

    return (
        <div className={cn(
            "relative w-full h-full flex flex-col bg-background",
            className
        )}>
            <textarea
                ref={textareaRef}
                value={localContent}
                onChange={handleChange}
                placeholder={placeholder}
                className={cn(
                    "w-full h-full",
                    "px-4 py-3",
                    "outline-none focus:outline-none border-0",
                    "bg-background text-foreground",
                    disableResize ? 'resize-none' : 'resize',
                    "scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20",
                    "focus:ring-0 focus:ring-offset-0",
                    "pb-12"
                )}
                spellCheck="false"
            />
            <div className="absolute bottom-0 right-0 left-0 h-10 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            <NoteActionButtons
                className={cn(
                    "absolute top-1 right-1",
                    "z-10"
                )}
            />
        </div>
    );
};

export default PlainTextArea;
