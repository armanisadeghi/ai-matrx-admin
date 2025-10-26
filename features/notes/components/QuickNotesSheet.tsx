// features/notes/components/QuickNotesSheet.tsx
"use client";

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { NoteEditor } from './NoteEditor';
import { useNotesContext } from '../context/NotesContext';
import { useAllFolders } from '../utils/folderUtils';
import type { Note } from '../types';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FolderOpen, ExternalLink, Copy, Share2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShareNoteDialog } from './ShareNoteDialog';
import { useToastManager } from '@/hooks/useToastManager';
import { cn } from '@/lib/utils';

interface QuickNotesSheetProps {
    onClose?: () => void;
    className?: string;
}

export function QuickNotesSheet({ onClose, className }: QuickNotesSheetProps) {
    const {
        notes,
        isLoading,
        activeNote,
        setActiveNote,
        deleteNote,
        copyNote,
        updateNote,
        refreshNotes,
        findOrCreateEmptyNote,
    } = useNotesContext();
    const toast = useToastManager('notes');
    const [shareNoteId, setShareNoteId] = useState<string | null>(null);

    // Refresh when sheet opens
    useEffect(() => {
        refreshNotes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once when component mounts

    // Get all folders - optimized to only recalculate when folder names change
    const allFolders = useAllFolders(notes);

    // Group notes by folder for the selector - single source of truth
    const notesByFolder = useMemo(() => {
        const grouped: Record<string, Note[]> = {};
        
        // Initialize all folders (including defaults)
        allFolders.forEach(folder => {
            grouped[folder] = [];
        });
        
        // Add notes to their folders
        notes.forEach(note => {
            if (grouped[note.folder_name]) {
                grouped[note.folder_name].push(note);
            }
        });
        
        return grouped;
    }, [notes, allFolders]);

    const handleCreateNote = useCallback(async () => {
        try {
            const targetFolder = activeNote?.folder_name || 'Draft';
            await findOrCreateEmptyNote(targetFolder);
            toast.success('Note ready');
        } catch (error) {
            console.error('Error creating note:', error);
            toast.error(error);
        }
    }, [activeNote, findOrCreateEmptyNote, toast]);

    const handleDeleteNote = useCallback(async () => {
        if (!activeNote) return;
        
        try {
            const noteLabel = activeNote.label;
            await deleteNote(activeNote.id);
            toast.success(`"${noteLabel}" deleted`);
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error(error);
        }
    }, [activeNote, deleteNote, toast]);

    const handleCopyNote = useCallback(async () => {
        if (!activeNote) return;
        
        try {
            const noteLabel = activeNote.label;
            await copyNote(activeNote.id);
            toast.success(`"${noteLabel}" copied`);
        } catch (error) {
            console.error('Error copying note:', error);
            toast.error(error);
        }
    }, [activeNote, copyNote, toast]);

    const handleShareNote = useCallback(() => {
        if (!activeNote) return;
        setShareNoteId(activeNote.id);
    }, [activeNote]);

    const handleUpdateNote = useCallback((noteId: string, updates: Partial<Note>) => {
        // Context handles the update
        updateNote(noteId, updates);
    }, [updateNote]);

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
                                onClick={handleCreateNote}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>New Note</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {activeNote && (
                    <>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={handleCopyNote}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Note</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={handleShareNote}
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Share Note</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={handleDeleteNote}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Note</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </>
                )}

                <div className="ml-auto pl-2 border-l border-zinc-200 dark:border-zinc-800">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => window.open('/notes', '_blank')}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open in New Tab</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
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
