// features/notes/components/NoteTabs.tsx
"use client";

import React, { useRef, useEffect } from 'react';
import { X, FileText, Copy, Share2, Trash2, Plus } from 'lucide-react';
import { useNotesContext } from '../context/NotesContext';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NoteTabsProps {
    onCreateNote: () => void;
    onDeleteNote: (noteId: string) => void;
    onCopyNote: (noteId: string) => void;
    onShareNote: (noteId: string) => void;
    onUpdateNote: (noteId: string, updates: any) => void;
}

export function NoteTabs({ 
    onCreateNote, 
    onDeleteNote, 
    onCopyNote, 
    onShareNote,
    onUpdateNote 
}: NoteTabsProps) {
    const { notes, openTabs, activeNote, openNoteInTab, closeTab } = useNotesContext();
    const activeTabRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active tab when it changes
    useEffect(() => {
        if (activeTabRef.current) {
            activeTabRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [activeNote?.id]);

    const handleTabClick = (noteId: string) => {
        openNoteInTab(noteId);
    };

    const handleCloseTab = (e: React.MouseEvent, noteId: string) => {
        e.stopPropagation();
        closeTab(noteId);
    };

    const handleLabelChange = (noteId: string, newLabel: string) => {
        onUpdateNote(noteId, { label: newLabel });
    };

    return (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hidden md:block">
            <ScrollArea className="w-full">
                <div className="flex items-center px-2 py-1 gap-1">
                    {/* New Note Button */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onCreateNote}
                                    className="flex items-center justify-center h-7 w-7 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                                >
                                    <Plus className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>New Note</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Tabs */}
                    {openTabs.map((noteId) => {
                        const note = notes.find(n => n.id === noteId);
                        if (!note) return null;

                        const isActive = activeNote?.id === noteId;

                        return (
                            <div
                                key={noteId}
                                ref={isActive ? activeTabRef : null}
                                className={cn(
                                    "group flex items-center gap-1.5 px-2 py-1 rounded-t border-b-2 transition-all flex-shrink-0",
                                    "min-w-[200px] max-w-[400px]",
                                    isActive
                                        ? "bg-white dark:bg-zinc-800 border-blue-500 dark:border-blue-400"
                                        : "bg-transparent border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                )}
                            >
                                <FileText 
                                    className={cn(
                                        "flex-shrink-0 cursor-pointer",
                                        isActive ? "h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300" : "h-3.5 w-3.5 text-zinc-500 dark:text-zinc-500"
                                    )}
                                    onClick={() => handleTabClick(noteId)}
                                />
                                
                                {isActive ? (
                                    <Input
                                        type="text"
                                        value={note.label}
                                        onChange={(e) => handleLabelChange(noteId, e.target.value)}
                                        className="flex-1 h-6 text-xs border-0 bg-transparent px-1 focus-visible:ring-1 focus-visible:ring-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span 
                                        className="flex-1 text-xs font-medium truncate cursor-pointer text-zinc-600 dark:text-zinc-400"
                                        onClick={() => handleTabClick(noteId)}
                                    >
                                        {note.label}
                                    </span>
                                )}

                                {/* Action buttons area */}
                                <div className="flex items-center gap-0.5">
                                    {/* Full actions - ONLY on active tab */}
                                    {isActive && (
                                        <>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onCopyNote(noteId);
                                                            }}
                                                            className="flex items-center justify-center h-5 w-5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
                                                        >
                                                            <Copy className="h-3 w-3 text-zinc-600 dark:text-zinc-400" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Duplicate</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onShareNote(noteId);
                                                            }}
                                                            className="flex items-center justify-center h-5 w-5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
                                                        >
                                                            <Share2 className="h-3 w-3 text-zinc-600 dark:text-zinc-400" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Share</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteNote(noteId);
                                                            }}
                                                            className="flex items-center justify-center h-5 w-5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="h-3 w-3 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </>
                                    )}

                                    {/* Close button - visible on hover for inactive, always visible for active */}
                                    <div
                                        onClick={(e) => handleCloseTab(e, noteId)}
                                        className={cn(
                                            "flex items-center justify-center h-5 w-5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-all cursor-pointer",
                                            isActive ? "ml-0.5" : "",
                                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                        )}
                                        title="Close tab"
                                    >
                                        <X className="h-3 w-3 text-zinc-600 dark:text-zinc-400" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <ScrollBar orientation="horizontal" className="h-1.5" />
            </ScrollArea>
        </div>
    );
}

