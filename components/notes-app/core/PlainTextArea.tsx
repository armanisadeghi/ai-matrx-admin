// components/notes-app/core/PlainTextArea.tsx
'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from "@/lib/utils";
import { NoteActionButtons } from '../shared/buttons/ActionButton';
import { useNotesManagerContext } from '@/contexts/NotesManagerContext';
import debounce from 'lodash/debounce';

interface PlainTextAreaProps {
    className?: string;
    placeholder?: string;
    disableResize?: boolean;
}

const PlainTextArea = ({
    className,
    placeholder = 'Enter text here...',
    disableResize = true,
}: PlainTextAreaProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { currentNote, handleNoteChange } = useNotesManagerContext();

    // Local state for the textarea
    const [localContent, setLocalContent] = useState(currentNote?.content || '');

    // Update local content when note changes
    useEffect(() => {
        setLocalContent(currentNote?.content || '');
    }, [currentNote?.id]); // Only update when switching notes

    // Debounced save function
    const debouncedSave = useCallback(
        debounce((content: string) => {
            handleNoteChange({ content });
        }, 1000),
        []
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setLocalContent(newContent); // Update local state immediately
        debouncedSave(newContent); // Debounce the save to global state
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
