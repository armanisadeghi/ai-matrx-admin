// features/notes/components/NotesLayout.tsx
"use client";

import React, { useCallback, useState } from 'react';
import { NotesSidebar } from './NotesSidebar';
import { NoteEditor } from './NoteEditor';
import { NoteToolbar } from './NoteToolbar';
import { CreateFolderDialog } from './CreateFolderDialog';
import { ShareNoteDialog } from './ShareNoteDialog';
import { useNotesContext } from '../context/NotesContext';
import { useAllFolders } from '../utils/folderUtils';
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
    const {
        notes,
        isLoading,
        activeNote,
        setActiveNote,
        createNote,
        updateNote,
        deleteNote,
        copyNote,
        refreshNotes,
        findOrCreateEmptyNote,
    } = useNotesContext();

    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [shareNoteId, setShareNoteId] = useState<string | null>(null);
    const toast = useToastManager('notes');

    // Note: refreshNotes() is already called on mount by NotesContext, no need to call again here

    // Get all folders (default + custom) - optimized to only recalculate when folder names change
    const existingFolders = useAllFolders(notes);

    const handleCreateNote = useCallback(async (folderName?: string) => {
        try {
            const targetFolder = folderName || 'Draft';
            
            // Use the context method which handles duplicate checking
            const note = await findOrCreateEmptyNote(targetFolder);
            setIsMobileSidebarOpen(false);
            
            toast.success('Note ready');
        } catch (error) {
            console.error('Error creating note:', error);
            toast.error(error);
        }
    }, [findOrCreateEmptyNote, toast]);

    const handleCreateFolder = useCallback(() => {
        setIsCreateFolderOpen(true);
    }, []);

    const handleConfirmCreateFolder = useCallback(async (folderName: string) => {
        try {
            // Use the context method which finds or creates an empty note
            await findOrCreateEmptyNote(folderName);
            setIsMobileSidebarOpen(false);
            
            toast.success(`Folder "${folderName}" created`);
        } catch (error) {
            console.error('Error creating folder:', error);
            toast.error(error);
        }
    }, [findOrCreateEmptyNote, toast]);

    const handleDeleteNote = useCallback(async (noteId: string) => {
        try {
            const noteToDelete = notes.find(n => n.id === noteId);
            await deleteNote(noteId);
            
            toast.success(`"${noteToDelete?.label || 'Note'}" deleted`);
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error(error);
        }
    }, [notes, deleteNote, toast]);

    const handleCopyNote = useCallback(async (noteId: string) => {
        try {
            const noteToCopy = notes.find(n => n.id === noteId);
            await copyNote(noteId);
            
            toast.success(`"${noteToCopy?.label || 'Note'}" copied`);
        } catch (error) {
            console.error('Error copying note:', error);
            toast.error(error);
        }
    }, [notes, copyNote, toast]);

    const handleShareNote = useCallback((noteId: string) => {
        setShareNoteId(noteId);
    }, []);

    const handleSaveNote = useCallback(async () => {
        if (!activeNote) return;
        
        try {
            // Force save by triggering an update with current data
            await updateNote(activeNote.id, {
                label: activeNote.label,
                content: activeNote.content,
                folder_name: activeNote.folder_name,
                tags: activeNote.tags,
            });
            toast.success('Note saved');
        } catch (error) {
            console.error('Error saving note:', error);
            toast.error(error);
        }
    }, [activeNote, updateNote, toast]);

    const handleUpdateNote = useCallback((noteId: string, updates: Partial<Note>) => {
        // Context handles optimistic updates automatically
        updateNote(noteId, updates);
    }, [updateNote]);

    const handleMoveNote = useCallback(async (noteId: string, newFolder: string) => {
        try {
            const note = notes.find(n => n.id === noteId);
            if (!note) return;
            
            await updateNote(noteId, { folder_name: newFolder });
            
            toast.success(`Moved "${note.label}" to "${newFolder}"`);
        } catch (error) {
            console.error('Error moving note:', error);
            toast.error(error);
        }
    }, [notes, updateNote, toast]);


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
                    onSave={handleSaveNote}
                    onCopyNote={handleCopyNote}
                    onShareNote={handleShareNote}
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

            {/* Share Note Dialog */}
            {shareNoteId && (
                <ShareNoteDialog
                    open={shareNoteId !== null}
                    onOpenChange={(open) => !open && setShareNoteId(null)}
                    noteId={shareNoteId}
                    noteLabel={notes.find(n => n.id === shareNoteId)?.label || 'Note'}
                />
            )}
        </div>
    );
}

