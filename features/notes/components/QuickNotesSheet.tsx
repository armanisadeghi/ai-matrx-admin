// features/notes/components/QuickNotesSheet.tsx
"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { NoteEditor } from './NoteEditor';
import { useNotes } from '../hooks/useNotes';
import { useActiveNote } from '../hooks/useActiveNote';
import { createNote, deleteNote, updateNote } from '../service/notesService';
import { generateUniqueLabel, findEmptyNewNote, findEmptyNewNoteInFolder } from '../utils/noteUtils';
import type { Note } from '../types';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FolderOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToastManager } from '@/hooks/useToastManager';
import { cn } from '@/lib/utils';

interface QuickNotesSheetProps {
    onClose?: () => void;
    className?: string;
}

export function QuickNotesSheet({ onClose, className }: QuickNotesSheetProps) {
    const { notes, isLoading, refreshNotes, setNotes } = useNotes();
    const toast = useToastManager('notes');

    const handleNoteCreated = useCallback((note: Note) => {
        setNotes(prev => [note, ...prev]);
    }, [setNotes]);

    const { activeNote, setActiveNote, updateActiveNoteLocally } = useActiveNote({
        notes,
        onNoteCreated: handleNoteCreated,
    });

    // Group notes by folder for the selector
    const notesByFolder = useMemo(() => {
        const grouped: Record<string, Note[]> = {};
        notes.forEach(note => {
            if (!grouped[note.folder_name]) {
                grouped[note.folder_name] = [];
            }
            grouped[note.folder_name].push(note);
        });
        return grouped;
    }, [notes]);

    const handleCreateNote = useCallback(async (folderName?: string) => {
        try {
            const targetFolder = folderName || activeNote?.folder_name || 'General';
            
            // Check if there's already an empty "New Note" in this folder
            const existingEmptyNote = findEmptyNewNoteInFolder(notes, targetFolder);
            if (existingEmptyNote) {
                setActiveNote(existingEmptyNote);
                return;
            }
            
            const uniqueLabel = generateUniqueLabel(notes);
            const newNote = await createNote({
                label: uniqueLabel,
                folder_name: targetFolder,
                content: '',
            });
            
            setNotes(prev => [newNote, ...prev]);
            setActiveNote(newNote);
        } catch (error) {
            console.error('Error creating note:', error);
            toast.error(error);
        }
    }, [notes, activeNote, setNotes, setActiveNote, toast]);

    const handleDeleteNote = useCallback(async (noteId: string) => {
        try {
            const noteToDelete = notes.find(n => n.id === noteId);
            await deleteNote(noteId);
            
            setNotes(prev => prev.filter(n => n.id !== noteId));
            
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
        setNotes(prev =>
            prev.map(note =>
                note.id === noteId ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
            )
        );
        
        if (activeNote?.id === noteId) {
            updateActiveNoteLocally(updates);
        }
    }, [setNotes, activeNote, updateActiveNoteLocally]);

    const handleSelectNote = useCallback((noteId: string) => {
        const note = notes.find(n => n.id === noteId);
        if (note) {
            setActiveNote(note);
        }
    }, [notes, setActiveNote]);

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center h-full", className)}>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading notes...</div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Compact Header with Note Selector */}
            <div className="flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <Select
                    value={activeNote?.id || ''}
                    onValueChange={handleSelectNote}
                >
                    <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Select a note">
                            {activeNote ? (
                                <span className="flex items-center gap-2">
                                    <FolderOpen className="h-3 w-3 text-zinc-400" />
                                    <span className="font-medium">{activeNote.folder_name}</span>
                                    <span className="text-zinc-400">/</span>
                                    <span>{activeNote.label}</span>
                                </span>
                            ) : (
                                'Select a note'
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                        {Object.entries(notesByFolder).map(([folder, folderNotes]) => (
                            <React.Fragment key={folder}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                    {folder}
                                </div>
                                {folderNotes.map((note) => (
                                    <SelectItem key={note.id} value={note.id} className="text-xs pl-4">
                                        {note.label}
                                    </SelectItem>
                                ))}
                            </React.Fragment>
                        ))}
                    </SelectContent>
                </Select>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCreateNote()}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>New Note</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {activeNote && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDeleteNote(activeNote.id)}
                                >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Note</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            {/* Editor - Takes full remaining space */}
            <div className="flex-1 overflow-hidden">
                <NoteEditor
                    note={activeNote}
                    onUpdate={handleUpdateNote}
                    allNotes={notes}
                    className="h-full"
                />
            </div>
        </div>
    );
}

