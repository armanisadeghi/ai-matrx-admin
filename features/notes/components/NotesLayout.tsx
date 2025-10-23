// features/notes/components/NotesLayout.tsx
"use client";

import React, { useCallback, useState, useMemo } from 'react';
import { NotesSidebar } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import { NoteToolbar } from './NoteToolbar';
import { CreateFolderDialog } from './CreateFolderDialog';
import { useNotes } from '../hooks/useNotes';
import { useActiveNote } from '../hooks/useActiveNote';
import { createNote, deleteNote, updateNote } from '../service/notesService';
import { generateUniqueLabel, findEmptyNewNote, findEmptyNewNoteInFolder } from '../utils/noteUtils';
import type { Note } from '../types';
import { cn } from '@/lib/utils';
import { Loader2, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useToastManager } from '@/hooks/useToastManager';

interface NotesLayoutProps {
    className?: string;
}

export function NotesLayout({ className }: NotesLayoutProps) {
    const { notes, isLoading, refreshNotes, setNotes } = useNotes();
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const toast = useToastManager('notes');

    // Get existing folder names for validation
    const existingFolders = useMemo(() => {
        return Array.from(new Set(notes.map(n => n.folder_name)));
    }, [notes]);

    const handleNoteCreated = useCallback((note: Note) => {
        setNotes(prev => [note, ...prev]);
    }, [setNotes]);

    const { activeNote, setActiveNote, updateActiveNoteLocally } = useActiveNote({
        notes,
        onNoteCreated: handleNoteCreated,
    });

    const handleCreateNote = useCallback(async (folderName?: string) => {
        try {
            const targetFolder = folderName || 'General';
            
            // Check if there's already an empty "New Note" in this folder
            const existingEmptyNote = findEmptyNewNoteInFolder(notes, targetFolder);
            if (existingEmptyNote) {
                // Just activate the existing empty note instead of creating a new one
                setActiveNote(existingEmptyNote);
                setIsMobileSidebarOpen(false);
                toast.info('Using existing empty note');
                return;
            }
            
            const uniqueLabel = generateUniqueLabel(notes);
            const newNote = await createNote({
                label: uniqueLabel,
                folder_name: targetFolder,
                content: '',
            });
            
            // Add to notes list and set as active
            setNotes(prev => [newNote, ...prev]);
            setActiveNote(newNote);
            setIsMobileSidebarOpen(false);
            
            toast.success('Note created successfully');
        } catch (error) {
            console.error('Error creating note:', error);
            toast.error(error);
        }
    }, [notes, setNotes, setActiveNote, toast]);

    const handleCreateFolder = useCallback(() => {
        setIsCreateFolderOpen(true);
    }, []);

    const handleConfirmCreateFolder = useCallback(async (folderName: string) => {
        try {
            // Check if there's already an empty "New Note" - reuse it with new folder
            const existingEmptyNote = findEmptyNewNote(notes);
            if (existingEmptyNote) {
                // Move the existing empty note to the new folder
                const updatedNote = { ...existingEmptyNote, folder_name: folderName };
                await updateNote(existingEmptyNote.id, { folder_name: folderName });
                
                // Update in state
                setNotes(prev => prev.map(n => n.id === existingEmptyNote.id ? updatedNote : n));
                setActiveNote(updatedNote);
                setIsMobileSidebarOpen(false);
                
                toast.success(`Folder "${folderName}" created successfully`);
                return;
            }
            
            // Create an empty note in the new folder to establish it
            const newNote = await createNote({
                label: 'New Note',
                folder_name: folderName,
                content: '',
            });
            
            // Add to notes list and set as active
            setNotes(prev => [newNote, ...prev]);
            setActiveNote(newNote);
            setIsMobileSidebarOpen(false);
            
            toast.success(`Folder "${folderName}" created successfully`);
        } catch (error) {
            console.error('Error creating folder:', error);
            toast.error(error);
        }
    }, [notes, setNotes, setActiveNote, toast]);

    const handleDeleteNote = useCallback(async (noteId: string) => {
        try {
            const noteToDelete = notes.find(n => n.id === noteId);
            await deleteNote(noteId);
            
            // Remove from notes list
            setNotes(prev => prev.filter(n => n.id !== noteId));
            
            // If the deleted note was active, select another one
            if (activeNote?.id === noteId) {
                const remaining = notes.filter(n => n.id !== noteId);
                if (remaining.length > 0) {
                    setActiveNote(remaining[0]);
                } else {
                    setActiveNote(null);
                }
            }
            
            toast.success(`"${noteToDelete?.label || 'Note'}" deleted`);
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error(error);
        }
    }, [notes, activeNote, setNotes, setActiveNote, toast]);

    const handleUpdateNote = useCallback((noteId: string, updates: Partial<Note>) => {
        // Optimistic update
        setNotes(prev =>
            prev.map(note =>
                note.id === noteId ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
            )
        );
        
        // Update active note if it's the one being edited
        if (activeNote?.id === noteId) {
            updateActiveNoteLocally(updates);
        }
    }, [setNotes, activeNote, updateActiveNoteLocally]);

    const handleMoveNote = useCallback(async (noteId: string, newFolder: string) => {
        try {
            const note = notes.find(n => n.id === noteId);
            if (!note) return;

            // Optimistic update
            setNotes(prev =>
                prev.map(n =>
                    n.id === noteId ? { ...n, folder_name: newFolder, updated_at: new Date().toISOString() } : n
                )
            );

            // Update active note if it's the one being moved
            if (activeNote?.id === noteId) {
                updateActiveNoteLocally({ folder_name: newFolder });
            }

            // Save to database
            await updateNote(noteId, { folder_name: newFolder });
            
            toast.success(`Moved "${note.label}" to "${newFolder}"`);
        } catch (error) {
            console.error('Error moving note:', error);
            toast.error(error);
            // Revert on error
            refreshNotes();
        }
    }, [notes, activeNote, setNotes, updateActiveNoteLocally, refreshNotes, toast]);


    const handleSelectNote = useCallback((note: Note) => {
        setActiveNote(note);
        setIsMobileSidebarOpen(false); // Close mobile sidebar after selecting note
    }, [setActiveNote]);

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center h-full", className)}>
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className={cn("flex h-full overflow-hidden", className)}>
            {/* Desktop Sidebar */}
            <div
                style={{ width: `${sidebarWidth}px` }}
                className="shrink-0 hidden md:block"
            >
                <NotesSidebar
                    notes={notes}
                    activeNote={activeNote}
                    onSelectNote={setActiveNote}
                    onCreateNote={handleCreateNote}
                    onDeleteNote={handleDeleteNote}
                    onCreateFolder={handleCreateFolder}
                    onMoveNote={handleMoveNote}
                />
            </div>

            {/* Main Editor */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile: Show menu button in toolbar */}
                <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-textured md:hidden">
                    <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 m-1.5">
                                <Menu className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[280px]">
                            <NotesSidebar
                                notes={notes}
                                activeNote={activeNote}
                                onSelectNote={handleSelectNote}
                                onCreateNote={handleCreateNote}
                                onDeleteNote={handleDeleteNote}
                                onCreateFolder={handleCreateFolder}
                                onMoveNote={handleMoveNote}
                            />
                        </SheetContent>
                    </Sheet>
                </div>

                <NoteToolbar
                    activeNote={activeNote}
                    onCreateNote={handleCreateNote}
                    onDeleteNote={handleDeleteNote}
                    onRefresh={refreshNotes}
                    className="hidden md:flex"
                />
                
                <NoteEditor
                    note={activeNote}
                    onUpdate={handleUpdateNote}
                    allNotes={notes}
                    className="flex-1"
                />
            </div>

            {/* Create Folder Dialog */}
            <CreateFolderDialog
                open={isCreateFolderOpen}
                onOpenChange={setIsCreateFolderOpen}
                onConfirm={handleConfirmCreateFolder}
                existingFolders={existingFolders}
            />
        </div>
    );
}

