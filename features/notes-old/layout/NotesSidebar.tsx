'use client';

import { useNotesManager } from '@/features/notes/hooks/useNotesManager';
import { NoteItem } from '@/features/notes/shared/NotesItem';
import { NotesControls } from '@/features/notes/core/NotesControls';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { MouseEvent } from 'react';

export const NotesSidebar = () => {
    const { notes, handleAddNote, selectedFolderId } = useNotesManager();

    const handleNewNote = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        handleAddNote(selectedFolderId);
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Controls Section */}
            <div className="p-3 border-b border-border/50 dark:border-border/30">
                <NotesControls />
            </div>
            
            {/* Notes List */}
            <div className="flex-1 overflow-y-auto">
                {notes.map(note => (
                    <NoteItem key={note.id} note={note} />
                ))}
            </div>
            
            {/* New Note Button */}
            <div className="p-3 border-t border-border/50 dark:border-border/30">
                <Button
                    onClick={handleNewNote}
                    className="w-full"
                    size="sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Note
                </Button>
            </div>
        </div>
    );
};

export default NotesSidebar;
