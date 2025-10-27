// features/notes/components/NotesSidebar.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
    FolderOpen, 
    FileText, 
    Plus, 
    Search, 
    Filter,
    SortAsc,
    SortDesc,
    Trash2,
    ChevronDown,
    ChevronRight,
    FolderPlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { Note, NoteFilters, NoteSortConfig } from '../types';
import { filterNotes, sortNotes, groupNotesByFolder } from '../utils/noteUtils';
import { getFolderIconAndColor } from '../utils/folderUtils';
import { cn } from '@/lib/utils';

interface NotesSidebarProps {
    notes: Note[];
    activeNote: Note | null;
    onSelectNote: (note: Note) => void;
    onCreateNote: (folderName?: string) => void;
    onDeleteNote: (noteId: string) => void;
    onCreateFolder?: () => void;
    onMoveNote?: (noteId: string, newFolder: string) => void;
    className?: string;
}

export function NotesSidebar({
    notes,
    activeNote,
    onSelectNote,
    onCreateNote,
    onDeleteNote,
    onCreateFolder,
    onMoveNote,
    className,
}: NotesSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<NoteSortConfig>({
        field: 'updated_at',
        order: 'desc',
    });
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [draggedNote, setDraggedNote] = useState<Note | null>(null);
    const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);

    // Filter and sort notes
    const processedNotes = useMemo(() => {
        const filters: NoteFilters = searchQuery ? { search: searchQuery } : {};
        const filtered = filterNotes(notes, filters);
        return sortNotes(filtered, sortConfig);
    }, [notes, searchQuery, sortConfig]);

    // Group by folders
    const folderGroups = useMemo(() => {
        return groupNotesByFolder(processedNotes);
    }, [processedNotes]);

    // Auto-expand folder containing active note
    useEffect(() => {
        if (activeNote) {
            setCollapsedFolders(prev => {
                const next = new Set(prev);
                next.delete(activeNote.folder_name);
                return next;
            });
        }
    }, [activeNote?.id, activeNote?.folder_name]);

    const toggleFolder = (folderName: string) => {
        setCollapsedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderName)) {
                next.delete(folderName);
            } else {
                next.add(folderName);
            }
            return next;
        });
    };

    const toggleSortOrder = () => {
        setSortConfig(prev => ({
            ...prev,
            order: prev.order === 'asc' ? 'desc' : 'asc',
        }));
    };

    // Drag and Drop handlers
    const handleDragStart = (note: Note) => (e: React.DragEvent) => {
        setDraggedNote(note);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', note.id);
    };

    const handleDragEnd = () => {
        setDraggedNote(null);
        setDropTargetFolder(null);
    };

    const handleDragOver = (folderName: string) => (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTargetFolder(folderName);
    };

    const handleDragLeave = () => {
        setDropTargetFolder(null);
    };

    const handleDrop = (folderName: string) => (e: React.DragEvent) => {
        e.preventDefault();
        setDropTargetFolder(null);

        if (draggedNote && draggedNote.folder_name !== folderName) {
            onMoveNote?.(draggedNote.id, folderName);
        }

        setDraggedNote(null);
    };

    return (
        <div className={cn("flex flex-col h-full bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800", className)}>
            {/* Compact Search Header - VS Code Style */}
            <div className="flex items-center gap-1 p-1.5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="relative flex-1">
                    <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
                    <Input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-6 h-6 text-xs bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                    />
                </div>
            </div>

            {/* Folder/File Tree - VS Code Compact Style */}
            <ScrollArea className="flex-1">
                <div className="p-0.5">
                    {folderGroups.length === 0 ? (
                        <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 py-3">
                            No notes found
                        </div>
                    ) : (
                        folderGroups.map((group) => {
                            const isCollapsed = collapsedFolders.has(group.folder_name);
                            const isDropTarget = dropTargetFolder === group.folder_name;
                            const hasNotes = group.count > 0;
                            const { icon: FolderIcon, color: iconColor } = getFolderIconAndColor(group.folder_name);
                            
                            return (
                                <div key={group.folder_name} className="mb-0.5">
                                    {/* Folder Header - Drop Zone - Fixed Layout */}
                                    <div 
                                        className="group flex items-center gap-0.5 mb-0.5"
                                        onDragOver={handleDragOver(group.folder_name)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop(group.folder_name)}
                                    >
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-5 px-1 justify-start text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800",
                                                "flex-1 min-w-0",
                                                isDropTarget && "bg-blue-100 dark:bg-blue-900/30 border-2 border-dashed border-blue-500"
                                            )}
                                            onClick={() => hasNotes && toggleFolder(group.folder_name)}
                                        >
                                            {/* Chevron - only show if folder has notes */}
                                            {hasNotes && (
                                                isCollapsed ? (
                                                    <ChevronRight className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                                                ) : (
                                                    <ChevronDown className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                                                )
                                            )}
                                            {!hasNotes && <div className="w-2.5 mr-0.5 shrink-0" />}
                                            
                                            <FolderIcon className={cn("h-2.5 w-2.5 mr-1 shrink-0", iconColor)} />
                                            <span className="truncate flex-1 text-left min-w-0">{group.folder_name}</span>
                                        </Button>
                                        
                                        {/* Count - Fixed width to prevent layout shift */}
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 w-3 text-right shrink-0">
                                            {group.count}
                                        </span>
                                        
                                        {/* Add button - always visible with fixed width */}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5 w-5 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onCreateNote(group.folder_name);
                                                        }}
                                                    >
                                                        <Plus className="h-2.5 w-2.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">New Note in Folder</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    {/* Notes in Folder - Compact, only show if not collapsed and has notes */}
                                    {!isCollapsed && hasNotes && (
                                        <div className="ml-2 space-y-0.5">
                                            {group.notes.map((note) => {
                                                const isActive = activeNote?.id === note.id;
                                                const isDragging = draggedNote?.id === note.id;
                                                
                                                return (
                                                    <div
                                                        key={note.id}
                                                        className="group flex items-center gap-0.5 min-w-0"
                                                        draggable
                                                        onDragStart={handleDragStart(note)}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn(
                                                                "h-5 px-1 flex-1 justify-start text-xs rounded-none hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-move min-w-0 font-normal",
                                                                isActive && "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-medium border-b border-blue-500",
                                                                isDragging && "opacity-50"
                                                            )}
                                                            onClick={() => onSelectNote(note)}
                                                        >
                                                            {/* Tiny subtle icon */}
                                                            <div className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 mr-1.5 shrink-0" />
                                                            <span className="truncate flex-1 text-left min-w-0">
                                                                {note.label}
                                                            </span>
                                                        </Button>
                                                        
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteNote(note.id);
                                                            }}
                                                        >
                                                            <Trash2 className="h-2.5 w-2.5 text-red-500" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

