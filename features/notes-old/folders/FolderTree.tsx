// components/notes-app/folders/FolderTree.tsx
'use client';

import React, {useState, useMemo, useEffect} from 'react';
import {ChevronDown, ChevronRight, FileText, MoreVertical, Edit, Trash2, Copy} from 'lucide-react';
import {Note, Folder} from '@/features/notes/types';
import {cn} from '@/lib/utils';
import {folderTypes, renderFolderIcon} from "./folder-categories";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface FolderTreeProps {
    notes: Note[];
    folders: Folder[];
    selectedNoteId: string | null;
    selectedFolderId: string | null;
    onSelectNote: (noteId: string) => void;
    onSelectFolder: (folderId: string) => void;
    onAddFolder: () => void;
    onDeleteNote?: (noteId: string) => void;
    onDeleteFolder?: (folderId: string) => void;
    onRenameNote?: (noteId: string, newTitle: string) => void;
    onRenameFolder?: (folderId: string, newName: string) => void;
    className?: string;
    searchTerm?: string;
}

export const FolderTree: React.FC<FolderTreeProps> = (
    {
        notes,
        folders,
        selectedNoteId,
        selectedFolderId,
        onSelectNote,
        onSelectFolder,
        onDeleteNote,
        onDeleteFolder,
        onRenameNote,
        onRenameFolder,
        className,
        searchTerm = ''
    }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [mounted, setMounted] = useState(false);
    
    // Only render on client to avoid hydration issues
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const handleRenameFolder = (folderId: string, currentName: string) => {
        const newName = prompt('Rename folder:', currentName);
        if (newName && newName.trim() && newName !== currentName && onRenameFolder) {
            onRenameFolder(folderId, newName.trim());
        }
    };
    
    const handleDeleteFolder = (folderId: string, folderName: string) => {
        if (confirm(`Delete folder "${folderName}"? Notes in this folder will be moved to root.`) && onDeleteFolder) {
            onDeleteFolder(folderId);
        }
    };
    
    const handleRenameNote = (noteId: string, currentTitle: string) => {
        const newTitle = prompt('Rename note:', currentTitle);
        if (newTitle && newTitle.trim() && newTitle !== currentTitle && onRenameNote) {
            onRenameNote(noteId, newTitle.trim());
        }
    };
    
    const handleDeleteNote = (noteId: string, noteTitle: string) => {
        if (confirm(`Delete note "${noteTitle}"?`) && onDeleteNote) {
            onDeleteNote(noteId);
        }
    };

    // Create folder hierarchy
    const folderHierarchy = useMemo(() => {
        const hierarchy: Record<string | null, Folder[]> = {null: []};
        folders.forEach(folder => {
            if (!hierarchy[folder.parentId]) {
                hierarchy[folder.parentId] = [];
            }
            hierarchy[folder.parentId].push(folder);
        });
        return hierarchy;
    }, [folders]);

    // Get notes for a specific folder (filter out empty notes)
    const getNotesByFolder = (folderId: string | null) => {
        return notes.filter(note => {
            // Always show the selected note, even if empty
            if (note.id === selectedNoteId) {
                return note.folderId === folderId;
            }
            // Only show other notes if they have content
            const hasContent = note.title?.trim() || note.content?.trim();
            return note.folderId === folderId && hasContent;
        });
    };

    const toggleFolder = (folderId: string) => {
        setExpanded(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    const renderTree = (parentId: string | null = null, level = 0) => {
        const currentFolders = folderHierarchy[parentId] || [];
        const currentNotes = getNotesByFolder(parentId);

        return (
            <>
                {currentFolders.map(folder => (
                    <div
                        key={folder.id}
                        style={{paddingLeft: `${level * 8}px`}}
                    >
                        <div
                            className={cn(
                                "flex items-center justify-between h-7 px-2 hover:bg-accent/50 dark:hover:bg-accent/30 text-xs group rounded-sm transition-colors",
                                selectedFolderId === folder.id && "bg-accent dark:bg-accent/50"
                            )}
                        >
                            <div 
                                className="flex items-center flex-1 cursor-pointer"
                                onClick={() => {
                                    toggleFolder(folder.id);
                                    onSelectFolder(folder.id);
                                }}
                            >
                                <ChevronDown
                                    className={cn(
                                        "w-3.5 h-3.5 flex-shrink-0 transition-transform text-amber-500 dark:text-amber-400 mr-1",
                                        !expanded[folder.id] && "-rotate-90"
                                    )}
                                />
                                {renderFolderIcon(folder.type)}
                                <span className="truncate ml-1.5">{folder.name}</span>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleRenameFolder(folder.id, folder.name);
                                    }}>
                                        <Edit className="h-3.5 w-3.5 mr-2" />
                                        Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteFolder(folder.id, folder.name);
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {expanded[folder.id] && renderTree(folder.id, level + 1)}
                    </div>
                ))}
                {currentNotes.map(note => (
                    <div
                        key={note.id}
                        style={{paddingLeft: `${(level + 1) * 8}px`}}
                    >
                        <div
                            className={cn(
                                "flex items-center justify-between h-7 px-2 hover:bg-accent/50 dark:hover:bg-accent/30 text-xs rounded-sm transition-colors group",
                                selectedNoteId === note.id && "bg-accent dark:bg-accent/50"
                            )}
                        >
                            <div 
                                className="flex items-center flex-1 cursor-pointer"
                                onClick={() => onSelectNote(note.id)}
                            >
                                <FileText className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500 dark:text-emerald-400 mr-1.5"/>
                                <span className="truncate">{note.title}</span>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleRenameNote(note.id, note.title);
                                    }}>
                                        <Edit className="h-3.5 w-3.5 mr-2" />
                                        Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteNote(note.id, note.title);
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
            </>
        );
    };

    // Don't render on server - prevents hydration issues
    if (!mounted) {
        return (
            <div className={cn("h-full select-none px-2 py-2", className)}>
                {/* Server render: empty */}
            </div>
        );
    }
    
    return (
        <div className={cn("h-full select-none px-2 py-2", className)}>
            {renderTree()}
        </div>
    );
};

export default FolderTree;
