"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
    // Tab management
    openTabs: string[];
    openNoteInTab: (noteId: string) => void;
    closeTab: (noteId: string) => void;
    closeAllTabs: () => void;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function NotesProvider({ children }: { children: React.ReactNode }) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [openTabs, setOpenTabs] = useState<string[]>([]);
    const isRefreshing = useRef(false);
    const notesRef = useRef<Note[]>([]); // Add ref for notes to avoid callback dependencies
    const activeNoteRef = useRef<Note | null>(null);

    // Keep refs in sync with state
    useEffect(() => {
        notesRef.current = notes;
        activeNoteRef.current = activeNote;
    }, [notes, activeNote]);

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
        // Use ref to avoid dependency on notes state
        const currentNotes = notesRef.current;
        
        // First, check if we have an empty "New Note" in ANY folder
        const existingEmptyNote = findEmptyNewNote(currentNotes);
        
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
        const uniqueLabel = generateUniqueLabel(currentNotes);
        const newNote = await createNoteService({
            label: uniqueLabel,
            folder_name: folderName,
            content: '',
        });

        setNotes(prev => [newNote, ...prev]);
        setActiveNote(newNote);
        return newNote;
    }, []); // No dependencies now!

    // Create a new note (with duplicate checking)
    const createNote = useCallback(async (input: CreateNoteInput): Promise<Note> => {
        const targetFolder = input.folder_name || 'Draft';
        
        // If creating an empty note, check for existing empty notes first
        if (!input.content || input.content.trim() === '') {
            return findOrCreateEmptyNote(targetFolder);
        }

        // Creating a note with content, proceed normally
        const currentNotes = notesRef.current;
        const uniqueLabel = input.label || generateUniqueLabel(currentNotes);
        const newNote = await createNoteService({
            ...input,
            label: uniqueLabel,
        });

        setNotes(prev => [newNote, ...prev]);
        setActiveNote(newNote);
        return newNote;
    }, [findOrCreateEmptyNote]); // Only depend on findOrCreateEmptyNote which is now stable

    // Update a note
    const updateNote = useCallback(async (id: string, updates: UpdateNoteInput): Promise<Note> => {
        // Optimistic update
        setNotes(prev =>
            prev.map(note =>
                note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
            )
        );

        // Update active note if it's the one being edited (use functional setState)
        setActiveNote(prev => prev?.id === id ? { ...prev, ...updates } : prev);

        // Persist to database
        const updated = await updateNoteService(id, updates);
        
        // Update with server response
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
        setActiveNote(prev => prev?.id === id ? updated : prev);

        return updated;
    }, []); // No dependencies!

    // Delete a note
    const deleteNote = useCallback(async (id: string): Promise<void> => {
        // Optimistic delete and handle active note in one go
        setNotes(prev => {
            const remaining = prev.filter(n => n.id !== id);
            
            // If the deleted note was active, select another one
            const currentActive = activeNoteRef.current;
            if (currentActive?.id === id) {
                setActiveNote(remaining.length > 0 ? remaining[0] : null);
            }
            
            return remaining;
        });

        // Persist to database
        await deleteNoteService(id);
    }, []); // No dependencies!

    // Copy a note
    const copyNote = useCallback(async (id: string): Promise<Note> => {
        const copiedNote = await copyNoteService(id);
        setNotes(prev => [copiedNote, ...prev]);
        setActiveNote(copiedNote);
        return copiedNote;
    }, []);

    // Tab Management Functions
    
    // Open a note in a tab (or switch to it if already open)
    const openNoteInTab = useCallback((noteId: string) => {
        setOpenTabs(prev => {
            // Check if note is already in a tab
            const existingIndex = prev.indexOf(noteId);
            
            if (existingIndex !== -1) {
                // Note already open - just switch to it
                const note = notesRef.current.find(n => n.id === noteId);
                if (note) {
                    setActiveNote(note);
                }
                return prev; // No change to tabs
            }
            
            // Add new tab
            return [...prev, noteId];
        });
        
        // Set as active note
        const note = notesRef.current.find(n => n.id === noteId);
        if (note) {
            setActiveNote(note);
        }
    }, []);

    // Close a tab
    const closeTab = useCallback((noteId: string) => {
        setOpenTabs(prev => {
            const index = prev.indexOf(noteId);
            if (index === -1) return prev; // Not in tabs
            
            const newTabs = prev.filter(id => id !== noteId);
            
            // If closing the active note, switch to adjacent tab
            const currentActive = activeNoteRef.current;
            if (currentActive?.id === noteId && newTabs.length > 0) {
                // Switch to the tab at the same index (or previous if last)
                const nextIndex = index >= newTabs.length ? newTabs.length - 1 : index;
                const nextNoteId = newTabs[nextIndex];
                const nextNote = notesRef.current.find(n => n.id === nextNoteId);
                if (nextNote) {
                    setActiveNote(nextNote);
                }
            } else if (currentActive?.id === noteId && newTabs.length === 0) {
                // No more tabs, clear active note
                setActiveNote(null);
            }
            
            return newTabs;
        });
    }, []);

    // Close all tabs
    const closeAllTabs = useCallback(() => {
        setOpenTabs([]);
        setActiveNote(null);
    }, []);

    // Cleanup: Remove deleted notes from tabs
    useEffect(() => {
        setOpenTabs(prev => {
            const validNoteIds = new Set(notes.map(n => n.id));
            return prev.filter(id => validNoteIds.has(id));
        });
    }, [notes]);

    // Memoize context value to prevent unnecessary re-renders
    const value: NotesContextType = useMemo(() => ({
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
        openTabs,
        openNoteInTab,
        closeTab,
        closeAllTabs,
    }), [
        notes,
        isLoading,
        error,
        activeNote,
        createNote,
        updateNote,
        deleteNote,
        copyNote,
        refreshNotes,
        findOrCreateEmptyNote,
        openTabs,
        openNoteInTab,
        closeTab,
        closeAllTabs,
    ]);

    return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotesContext() {
    const context = useContext(NotesContext);
    if (context === undefined) {
        throw new Error('useNotesContext must be used within a NotesProvider');
    }
    return context;
}

