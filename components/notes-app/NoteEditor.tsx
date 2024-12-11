// components/NoteEditor.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateNote, deleteNote } from '@/lib/redux/notes/notesSlice';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { TagSelect } from './TagSelect';
import debounce from 'lodash/debounce';
import type { Note } from '@/types';

export const NoteEditor = () => {
    const dispatch = useAppDispatch();
    const selectedNoteId = useAppSelector(state => state.notes.selectedNoteId);
    const note = useAppSelector(state =>
        state.notes.notes.find(n => n.id === selectedNoteId)
    );
    const [localNote, setLocalNote] = useState(note);

    useEffect(() => {
        setLocalNote(note);
    }, [note]);

    const debouncedSave = useCallback(
        debounce((updatedNote: Note) => {
            dispatch(updateNote({
                ...updatedNote,
                updatedAt: new Date().toISOString()
            }));
        }, 1000),
        [dispatch]
    );

    const handleChange = (changes: Partial<Note>) => {
        if (!localNote) return;

        const updatedNote = {
            ...localNote,
            ...changes
        };
        setLocalNote(updatedNote);
        debouncedSave(updatedNote);
    };

    if (!localNote) {
        return <div className="p-4">Select a note to edit</div>;
    }

    return (
        <div className="flex-1 p-4 space-y-4">
            <div className="flex justify-between items-center">
                <Input
                    value={localNote.title}
                    onChange={(e) => handleChange({ title: e.target.value })}
                    className="text-xl font-semibold"
                    placeholder="Note title"
                />
                <Button
                    variant="destructive"
                    onClick={() => dispatch(deleteNote(localNote.id))}
                >
                    Delete
                </Button>
            </div>

            <TagSelect
                selectedTags={localNote.tags}
                onChange={(tags) => handleChange({ tags })}
            />

            <Textarea
                value={localNote.content}
                onChange={(e) => handleChange({ content: e.target.value })}
                className="min-h-[500px] resize-none"
                placeholder="Start writing..."
            />

            <Button
                onClick={() => {
                    navigator.clipboard.writeText(
                        `${localNote.title}\n\n${localNote.content}`
                    );
                }}
            >
                Copy Note
            </Button>
        </div>
    );
};

