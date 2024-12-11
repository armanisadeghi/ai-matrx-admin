// components/NotesList.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { setSelectedNote, addNote } from '@/lib/redux/notes/notesSlice';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { Note } from '@/types';

export const NotesList = () => {
    const dispatch = useAppDispatch();
    const notes = useAppSelector(state => state.notes.notes);
    const selectedNoteId = useAppSelector(state => state.notes.selectedNoteId);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [sortBy, setSortBy] = useState<'date' | 'title'>('date');

    const filteredAndSortedNotes = useMemo(() => {
        let filtered = notes.filter(note => {
            const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.content.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTag = !selectedTag || note.tags.includes(selectedTag);
            return matchesSearch && matchesTag;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            return a.title.localeCompare(b.title);
        });
    }, [notes, searchTerm, selectedTag, sortBy]);

    return (
        <div className="w-64 border-r border-border h-full flex flex-col">
            <div className="p-4 space-y-4">
                <Input
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                />
                <Select
                    value={sortBy}
                    onValueChange={(value: 'date' | 'title') => setSortBy(value)}
                >
                    <option value="date">Sort by Date</option>
                    <option value="title">Sort by Title</option>
                </Select>
            </div>
            <div className="flex-1 overflow-y-auto">
                {filteredAndSortedNotes.map((note) => (
                    <div
                        key={note.id}
                        className={`p-4 cursor-pointer hover:bg-accent ${
                            note.id === selectedNoteId ? 'bg-accent' : ''
                        }`}
                        onClick={() => dispatch(setSelectedNote(note.id))}
                    >
                        <h3 className="font-medium truncate">{note.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{note.content}</p>
                    </div>
                ))}
            </div>
            <Button
                className="m-4"
                onClick={() => {
                    const newNote: Note = {
                        id: crypto.randomUUID(),
                        title: 'New Note',
                        content: '',
                        tags: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    dispatch(addNote(newNote));
                    dispatch(setSelectedNote(newNote.id));
                }}
            >
                New Note
            </Button>
        </div>
    );
};
