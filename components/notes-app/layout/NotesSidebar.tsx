'use client';

import { useNotesManagerContext } from '@/contexts/NotesManagerContext';
import { NoteItem } from '@/components/notes-app/shared/NotesItem';
import { NotesControls } from '@/components/notes-app/core/NotesControls';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { MouseEvent } from 'react';

export const NotesSidebar = () => {
    const { notes, handleAddNote, selectedFolderId } = useNotesManagerContext();

    const handleNewNote = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        handleAddNote(selectedFolderId);
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-2 space-y-2">
                <NotesControls />
            </div>
            <div className="flex-1 overflow-y-auto">
                {notes.map(note => (
                    <NoteItem key={note.id} note={note} />
                ))}
            </div>
            <div className="p-2">
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
