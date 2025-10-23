// components/notes-app/core/NotesItem.tsx
'use client';

import { MoreHorizontal } from 'lucide-react';
import { useNotesManager } from '@/features/notes/hooks/useNotesManager';
import { IconButton } from './buttons/IconButton';
import { NoteContextMenu } from './buttons/NoteContextMenu';
import { cn } from '@/lib/utils';
import type { Note } from '@/features/notes/types';
import { MouseEvent } from 'react';

interface NoteItemProps {
    note: Note;
}

export const NoteItem = ({ note }: NoteItemProps) => {
    const { selectedNoteId, handleNoteSelect } = useNotesManager();
    const isSelected = note.id === selectedNoteId;

    const handleClick = () => {
        handleNoteSelect(note.id);
    };

    const handleMenuClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
    };

    return (
        <div
            className={cn(
                "group relative flex items-start p-3",
                "hover:bg-accent/50 transition-colors cursor-pointer",
                isSelected && "bg-accent"
            )}
            onClick={handleClick}
        >
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{note.title}</h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {note.content}
                </p>
            </div>
            <div className={cn(
                "absolute right-2 top-2",
                "opacity-0 group-hover:opacity-100",
                "transition-opacity",
                isSelected && "opacity-100"
            )}>
                <NoteContextMenu
                    trigger={
                        <IconButton
                            icon={MoreHorizontal}
                            variant="ghost"
                            onClick={handleMenuClick}
                        />
                    }
                />
            </div>
        </div>
    );
};


