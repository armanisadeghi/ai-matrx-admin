// features/notes/components/NoteToolbar.tsx
"use client";

import React from 'react';
import { Plus, Trash2, RefreshCw, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Note } from '../types';
import { cn } from '@/lib/utils';

interface NoteToolbarProps {
    activeNote: Note | null;
    onCreateNote: () => void;
    onDeleteNote: (noteId: string) => void;
    onCopyNote?: (noteId: string) => void;
    onShareNote?: (noteId: string) => void;
    onRefresh: () => void;
    className?: string;
}

export function NoteToolbar({
    activeNote,
    onCreateNote,
    onDeleteNote,
    onCopyNote,
    onShareNote,
    onRefresh,
    className,
}: NoteToolbarProps) {
    return (
        <div className={cn("flex items-center gap-2 px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900", className)}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onCreateNote()}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Create New Note</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {activeNote && onCopyNote && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onCopyNote(activeNote.id)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy Note</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {activeNote && onShareNote && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onShareNote(activeNote.id)}
                            >
                                <Share2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Share Note</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {activeNote && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onDeleteNote(activeNote.id)}
                            >
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Note</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={onRefresh}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh Notes</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                {activeNote && (
                    <span>
                        {new Date(activeNote.updated_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                        })}
                    </span>
                )}
            </div>
        </div>
    );
}

