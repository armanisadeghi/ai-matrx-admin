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
    Edit3,
    FolderInput,
    Copy,
    Download,
    Share2,
    XCircle,
} from 'lucide-react';
import AdvancedMenu, { MenuItem } from '@/components/official/AdvancedMenu';
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
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [contextMenuType, setContextMenuType] = useState<'folder' | 'note' | null>(null);
    const [contextMenuTarget, setContextMenuTarget] = useState<string | null>(null);
    const [isInitialRender, setIsInitialRender] = useState(true);

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

    // Initialize all folders as collapsed on first render
    useEffect(() => {
        if (isInitialRender && folderGroups.length > 0) {
            const allFolderNames = new Set(folderGroups.map(group => group.folder_name));
            setCollapsedFolders(allFolderNames);
            setIsInitialRender(false);
        }
    }, [folderGroups, isInitialRender]);

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

    // Folder context menu items
    const getFolderContextMenuItems = (folderName: string, notesCount: number): MenuItem[] => [
        {
            key: 'new-note',
            icon: Plus,
            label: 'New Note',
            description: `Create a note in ${folderName}`,
            action: () => onCreateNote(folderName),
            category: 'Actions',
        },
        {
            key: 'rename',
            icon: Edit3,
            label: 'Rename Folder',
            description: 'Change folder name',
            action: () => {
                // TODO: Implement folder rename
                console.log('Rename folder:', folderName);
            },
            disabled: true, // Will be enabled when rename is implemented
            category: 'Actions',
        },
        {
            key: 'collapse',
            icon: ChevronRight,
            label: collapsedFolders.has(folderName) ? 'Expand Folder' : 'Collapse Folder',
            description: collapsedFolders.has(folderName) ? 'Show notes' : 'Hide notes',
            action: () => toggleFolder(folderName),
            disabled: notesCount === 0,
            category: 'Actions',
        },
        {
            key: 'delete-all',
            icon: Trash2,
            label: 'Delete All Notes',
            description: `Delete all ${notesCount} note${notesCount !== 1 ? 's' : ''} in this folder`,
            action: () => {
                // TODO: Implement bulk delete with confirmation
                console.log('Delete all notes in:', folderName);
            },
            disabled: notesCount === 0,
            iconColor: 'text-red-500',
            category: 'Danger',
        },
    ];

    // Note context menu items
    const getNoteContextMenuItems = (note: Note): MenuItem[] => [
        {
            key: 'open',
            icon: FileText,
            label: 'Open Note',
            description: 'Open in editor',
            action: () => onSelectNote(note),
            category: 'Actions',
        },
        {
            key: 'duplicate',
            icon: Copy,
            label: 'Duplicate Note',
            description: 'Create a copy of this note',
            action: () => {
                // TODO: Implement note duplication from sidebar
                console.log('Duplicate note:', note.id);
            },
            category: 'Actions',
        },
        {
            key: 'move',
            icon: FolderInput,
            label: 'Move to Folder',
            description: 'Move to another folder',
            action: () => {
                // TODO: Implement move with folder picker
                console.log('Move note:', note.id);
            },
            category: 'Actions',
        },
        {
            key: 'download',
            icon: Download,
            label: 'Export Note',
            description: 'Download as markdown',
            action: async () => {
                const blob = new Blob([note.content], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${note.label}.md`;
                a.click();
                URL.revokeObjectURL(url);
            },
            category: 'Actions',
        },
        {
            key: 'delete',
            icon: Trash2,
            label: 'Delete Note',
            description: 'Permanently delete this note',
            action: () => onDeleteNote(note.id),
            iconColor: 'text-red-500',
            category: 'Danger',
        },
    ];

    // Handle context menu
    const handleFolderContextMenu = (e: React.MouseEvent, folderName: string, notesCount: number) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuType('folder');
        setContextMenuTarget(folderName);
        setContextMenuOpen(true);
    };

    const handleNoteContextMenu = (e: React.MouseEvent, note: Note) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuType('note');
        setContextMenuTarget(note.id);
        setContextMenuOpen(true);
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
                                        onContextMenu={(e) => handleFolderContextMenu(e, group.folder_name, group.count)}
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
                                            {/* Chevron - always show for consistency */}
                                            {isCollapsed ? (
                                                <ChevronRight className={cn(
                                                    "h-2.5 w-2.5 mr-0.5 shrink-0",
                                                    !hasNotes && "opacity-30"
                                                )} />
                                            ) : (
                                                <ChevronDown className={cn(
                                                    "h-2.5 w-2.5 mr-0.5 shrink-0",
                                                    !hasNotes && "opacity-30"
                                                )} />
                                            )}
                                            
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
                                        <div className="ml-3 space-y-0.5">
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
                                                        onDragOver={handleDragOver(group.folder_name)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={handleDrop(group.folder_name)}
                                                        onContextMenu={(e) => handleNoteContextMenu(e, note)}
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
                                                            <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 mr-0 shrink-0" />
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

            {/* Context Menu */}
            {contextMenuOpen && contextMenuType === 'folder' && contextMenuTarget && (
                <AdvancedMenu
                    isOpen={contextMenuOpen}
                    onClose={() => {
                        setContextMenuOpen(false);
                        setContextMenuType(null);
                        setContextMenuTarget(null);
                    }}
                    items={getFolderContextMenuItems(
                        contextMenuTarget,
                        folderGroups.find(g => g.folder_name === contextMenuTarget)?.count || 0
                    )}
                    title={`Folder: ${contextMenuTarget}`}
                    position="center"
                    width="280px"
                    closeOnAction={true}
                    categorizeItems={true}
                />
            )}

            {contextMenuOpen && contextMenuType === 'note' && contextMenuTarget && (
                <AdvancedMenu
                    isOpen={contextMenuOpen}
                    onClose={() => {
                        setContextMenuOpen(false);
                        setContextMenuType(null);
                        setContextMenuTarget(null);
                    }}
                    items={getNoteContextMenuItems(
                        notes.find(n => n.id === contextMenuTarget)!
                    )}
                    title="Note Actions"
                    description={notes.find(n => n.id === contextMenuTarget)?.label}
                    position="center"
                    width="280px"
                    closeOnAction={true}
                    categorizeItems={true}
                />
            )}
        </div>
    );
}

