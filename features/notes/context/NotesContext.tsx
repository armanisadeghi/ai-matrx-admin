"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { fetchNotes, createNote as createNoteService, updateNote as updateNoteService, deleteNote as deleteNoteService, copyNote as copyNoteService } from '../service/notesService';
import { findEmptyNewNote, generateUniqueLabel } from '../utils/noteUtils';
import type { Note, CreateNoteInput, UpdateNoteInput } from '../types';

interface NotesContextType {
    notes: Note[];
    isLoading: boolean;
    error: Error | null;
    activeNote: Note | null;
    setActiveNote: (note: Note | null) => void;
    createNote: (input: CreateNoteInput) => Promise<Note>;
    updateNote: (id: string, updates: UpdateNoteInput) => Promise<Note>;
    deleteNote: (id: string) => Promise<void>;
    copyNote: (id: string) => Promise<Note>;
    refreshNotes: () => Promise<void>;
    findOrCreateEmptyNote: (folderName?: string) => Promise<Note>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: React.ReactNode }) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const isRefreshing = useRef(false);
    const activeNoteRef = useRef<Note | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        activeNoteRef.current = activeNote;
    }, [activeNote]);

    // Fetch notes from database
    const refreshNotes = useCallback(async () => {
        if (isRefreshing.current) return;
        
        isRefreshing.current = true;
        setIsLoading(true);
        setError(null);
        
        try {
            const fetchedNotes = await fetchNotes();
            setNotes(fetchedNotes);
            
            // Update active note if it exists in the new data (use ref to avoid dependency)
            const currentActive = activeNoteRef.current;
            if (currentActive) {
                const updatedActiveNote = fetchedNotes.find(n => n.id === currentActive.id);
                if (updatedActiveNote) {
                    setActiveNote(updatedActiveNote);
                } else {
                    // Active note was deleted, select another or null
                    setActiveNote(fetchedNotes.length > 0 ? fetchedNotes[0] : null);
                }
            } else if (fetchedNotes.length > 0) {
                // No active note but we have notes, select the first one
                setActiveNote(fetchedNotes[0]);
            }
        } catch (err) {
            setError(err as Error);
            console.error("Failed to fetch notes:", err);
        } finally {
            setIsLoading(false);
            isRefreshing.current = false;
        }
    }, []); // No dependencies - stable function

    // Initial load
    useEffect(() => {
        refreshNotes();
    }, []);

    // Find or create an empty "New Note" - prevents duplicates
    const findOrCreateEmptyNote = useCallback(async (folderName: string = 'Draft'): Promise<Note> => {
        // First, check if we have an empty "New Note" in ANY folder
        const existingEmptyNote = findEmptyNewNote(notes);
        
        if (existingEmptyNote) {
            // If it's in a different folder, move it to the target folder
            if (existingEmptyNote.folder_name !== folderName) {
                const updated = await updateNoteService(existingEmptyNote.id, { folder_name: folderName });
                setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
                setActiveNote(updated);
                return updated;
            }
            // Already in the right folder, just return it
            setActiveNote(existingEmptyNote);
            return existingEmptyNote;
        }

        // No empty note exists, create a new one
        const uniqueLabel = generateUniqueLabel(notes);
        const newNote = await createNoteService({
            label: uniqueLabel,
            folder_name: folderName,
            content: '',
        });

        setNotes(prev => [newNote, ...prev]);
        setActiveNote(newNote);
        return newNote;
    }, [notes]);

    // Create a new note (with duplicate checking)
    const createNote = useCallback(async (input: CreateNoteInput): Promise<Note> => {
        const targetFolder = input.folder_name || 'Draft';
        
        // If creating an empty note, check for existing empty notes first
        if (!input.content || input.content.trim() === '') {
            return findOrCreateEmptyNote(targetFolder);
        }

        // Creating a note with content, proceed normally
        const uniqueLabel = input.label || generateUniqueLabel(notes);
        const newNote = await createNoteService({
            ...input,
            label: uniqueLabel,
        });

        setNotes(prev => [newNote, ...prev]);
        setActiveNote(newNote);
        return newNote;
    }, [notes, findOrCreateEmptyNote]);

    // Update a note
    const updateNote = useCallback(async (id: string, updates: UpdateNoteInput): Promise<Note> => {
        // Optimistic update
        setNotes(prev =>
            prev.map(note =>
                note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
            )
        );

        // Update active note if it's the one being edited
        if (activeNote?.id === id) {
            setActiveNote(prev => prev ? { ...prev, ...updates } : null);
        }

        // Persist to database
        const updated = await updateNoteService(id, updates);
        
        // Update with server response
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
        if (activeNote?.id === id) {
            setActiveNote(updated);
        }

        return updated;
    }, [activeNote]);

    // Delete a note
    const deleteNote = useCallback(async (id: string): Promise<void> => {
        // Optimistic delete
        setNotes(prev => prev.filter(n => n.id !== id));

        // If the deleted note was active, select another one
        if (activeNote?.id === id) {
            const remaining = notes.filter(n => n.id !== id);
            setActiveNote(remaining.length > 0 ? remaining[0] : null);
        }

        // Persist to database
        await deleteNoteService(id);
    }, [notes, activeNote]);

    // Copy a note
    const copyNote = useCallback(async (id: string): Promise<Note> => {
        const copiedNote = await copyNoteService(id);
        setNotes(prev => [copiedNote, ...prev]);
        setActiveNote(copiedNote);
        return copiedNote;
    }, []);

    const value: NotesContextType = {
        notes,
        isLoading,
        error,
        activeNote,
        setActiveNote,
        createNote,
        updateNote,
        deleteNote,
        copyNote,
        refreshNotes,
        findOrCreateEmptyNote,
    };

    return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotesContext() {
    const context = useContext(NotesContext);
    if (context === undefined) {
        throw new Error('useNotesContext must be used within a NotesProvider');
    }
    return context;
}

