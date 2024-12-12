// components/NotesList.tsx
'use client';

import React from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNotesManager } from '@/hooks/notes-app/useNotesManager';

export const NotesList = () => {
    const {
        notes: filteredAndSortedNotes,
        selectedNoteId,
        selectedFolderId,
        handleNoteSelect,
        handleAddNote,
        handleSearchChange,
        handleSortChange,
        searchTerm,
        sortBy,
    } = useNotesManager();

    return (
        <div className="w-48 min-w-[15rem] max-w-xs border-r flex flex-col h-full overflow-hidden">
            <div className="p-0 border-b">
                <Input
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full"
                />
            </div>
            <Select
                value={sortBy}
                onValueChange={handleSortChange}
            >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
            </Select>
            <div className="flex-1 overflow-y-auto">
                {filteredAndSortedNotes.map((note) => (
                    <div
                        key={note.id}
                        className={`p-4 cursor-pointer hover:bg-accent ${
                            note.id === selectedNoteId ? 'bg-accent' : ''
                        }`}
                        onClick={() => handleNoteSelect(note.id)}
                    >
                        <p className="text-sm truncate">{note.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{note.content}</p>
                    </div>
                ))}
            </div>
            <Button
                className="m-2"
                onClick={() => handleAddNote(selectedFolderId)}
            >
                <Plus className="h-4 w-4 mr-2"/>
                New Note
            </Button>
        </div>
    );
};

export default NotesList;
