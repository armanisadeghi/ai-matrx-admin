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
import { getDefaultFolder } from '../constants/defaultFolders';
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
            {/* Header */}
            <div className="flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm bg-white dark:bg-zinc-800"
                    />
                </div>
                
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
                        <TooltipContent>Create Note</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <DropdownMenu>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        {sortConfig.order === 'asc' ? (
                                            <SortAsc className="h-4 w-4" />
                                        ) : (
                                            <SortDesc className="h-4 w-4" />
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Sort Options</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSortConfig({ field: 'label', order: sortConfig.order })}>
                            Name
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortConfig({ field: 'updated_at', order: sortConfig.order })}>
                            Last Modified
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortConfig({ field: 'created_at', order: sortConfig.order })}>
                            Date Created
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={toggleSortOrder}>
                            {sortConfig.order === 'asc' ? 'Ascending' : 'Descending'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Folder/File Tree */}
            <ScrollArea className="flex-1">
                <div className="p-1.5">
                    {folderGroups.length === 0 ? (
                        <div className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-4">
                            No notes found
                        </div>
                    ) : (
                        folderGroups.map((group) => {
                            const isCollapsed = collapsedFolders.has(group.folder_name);
                            const isDropTarget = dropTargetFolder === group.folder_name;
                            const defaultFolder = getDefaultFolder(group.folder_name);
                            const FolderIcon = defaultFolder?.icon || FolderOpen;
                            const iconColor = defaultFolder?.color || '';
                            
                            return (
                                <div key={group.folder_name} className="mb-1">
                                    {/* Folder Header - Drop Zone */}
                                    <div 
                                        className="flex items-center gap-1 mb-0.5"
                                        onDragOver={handleDragOver(group.folder_name)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop(group.folder_name)}
                                    >
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "h-7 px-2 flex-1 justify-start text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800",
                                                isDropTarget && "bg-blue-100 dark:bg-blue-900/30 border-2 border-dashed border-blue-500"
                                            )}
                                            onClick={() => toggleFolder(group.folder_name)}
                                        >
                                            {isCollapsed ? (
                                                <ChevronRight className="h-3 w-3 mr-1" />
                                            ) : (
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                            )}
                                            <FolderIcon className={cn("h-3 w-3 mr-1.5", iconColor)} />
                                            <span className="truncate flex-1 text-left">{group.folder_name}</span>
                                            <span className="text-zinc-400 dark:text-zinc-500 ml-1">
                                                {group.count}
                                            </span>
                                        </Button>
                                        
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => onCreateNote(group.folder_name)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>New Note in Folder</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    {/* Notes in Folder */}
                                    {!isCollapsed && (
                                        <div className="ml-3 space-y-0.5">
                                            {group.notes.map((note) => {
                                                const isActive = activeNote?.id === note.id;
                                                const isDragging = draggedNote?.id === note.id;
                                                
                                                return (
                                                    <div
                                                        key={note.id}
                                                        className="group flex items-center gap-1"
                                                        draggable
                                                        onDragStart={handleDragStart(note)}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className={cn(
                                                                "h-7 px-2 flex-1 justify-start text-xs hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-move",
                                                                isActive && "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-medium border-l-2 border-blue-500",
                                                                isDragging && "opacity-50"
                                                            )}
                                                            onClick={() => onSelectNote(note)}
                                                        >
                                                            <FileText className="h-3 w-3 mr-1.5 shrink-0" />
                                                            <span className="truncate flex-1 text-left">
                                                                {note.label}
                                                            </span>
                                                        </Button>
                                                        
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteNote(note.id);
                                                            }}
                                                        >
                                                            <Trash2 className="h-3 w-3 text-red-500" />
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
                    
                    {/* New Folder Button */}
                    <div className="mt-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-xs justify-start"
                            onClick={onCreateFolder}
                        >
                            <FolderPlus className="h-3 w-3 mr-1.5" />
                            Add Folder
                        </Button>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

