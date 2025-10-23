// components/notes-app/layout/UnifiedSidebar.tsx
'use client';

import { FolderTree } from '../folders/FolderTree';
import { Button } from '@/components/ui/button';
import { Plus, Search, FolderPlus, FileText, Calendar, Type, Tag as TagIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { folderTypes } from '../folders/folder-categories';
import { TagFilter } from '@/features/notes/shared/selects/TagFilter';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const UnifiedSidebar = () => {
    const {
        notes,
        folders,
        selectedNoteId,
        selectedFolderId,
        handleNoteSelect,
        handleNoteChange,
        handleNoteDelete,
        handleFolderSelect,
        handleUpdateFolder,
        handleDeleteFolder,
        handleAddFolder,
        handleAddNote,
        searchTerm,
        handleSearchChange,
        sortBy,
        handleSortChange,
    } = useNotesManager();

    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderType, setNewFolderType] = useState('general');
    const [showTagFilter, setShowTagFilter] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            handleAddFolder({
                name: newFolderName.trim(),
                type: newFolderType,
                parentId: selectedFolderId,
            });
            setNewFolderName('');
            setNewFolderType('general');
            setIsNewFolderOpen(false);
        }
    };

    const handleQuickFolderCreate = () => {
        const folderName = prompt('Folder name:');
        if (folderName?.trim()) {
            handleAddFolder({
                name: folderName.trim(),
                type: 'general',
                parentId: selectedFolderId,
            });
        }
    };

    const toggleSort = () => {
        handleSortChange(sortBy === 'date' ? 'title' : 'date');
    };

    const getSortIcon = () => {
        if (sortBy === 'date') {
            return <Calendar className="h-4 w-4" />;
        }
        return <Type className="h-4 w-4" />;
    };

    const getSortLabel = () => {
        return sortBy === 'date' ? 'Sort by Date' : 'Sort by Title';
    };

    return (
            <div className="h-full flex flex-col bg-background">
                {/* Header with Search and Actions */}
                <div className="p-3 border-b border-border/50 dark:border-border/30 space-y-2.5">
                    {/* Title and Quick Actions */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Notes & Folders
                        </h2>
                        <div className="flex items-center gap-1">
                            {/* Tag Filter Toggle */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={showTagFilter ? "secondary" : "ghost"}
                                        size="icon"
                                        onClick={() => setShowTagFilter(!showTagFilter)}
                                        className="h-7 w-7"
                                    >
                                        <TagIcon className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Filter by Tags</TooltipContent>
                            </Tooltip>

                            {/* Sort Toggle */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleSort}
                                        className="h-7 w-7"
                                    >
                                        {getSortIcon()}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">{getSortLabel()}</TooltipContent>
                            </Tooltip>

                            {/* New Note */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleAddNote(selectedFolderId)}
                                        className="h-7 w-7"
                                    >
                                        <FileText className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">New Note</TooltipContent>
                            </Tooltip>

                            {/* New Folder */}
                            <Popover open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                            >
                                                <FolderPlus className="h-3.5 w-3.5" />
                                            </Button>
                                        </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">New Folder</TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-80" align="end">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm">Create New Folder</h4>
                                            <p className="text-xs text-muted-foreground">
                                                Organize your notes into folders
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="folder-name" className="text-xs">Folder Name</Label>
                                                <Input
                                                    id="folder-name"
                                                    placeholder="Enter folder name..."
                                                    value={newFolderName}
                                                    onChange={(e) => setNewFolderName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCreateFolder();
                                                        }
                                                    }}
                                                    className="h-8"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="folder-type" className="text-xs">Type</Label>
                                                <Select
                                                    value={newFolderType}
                                                    onValueChange={(value) => setNewFolderType(value)}
                                                >
                                                    <SelectTrigger id="folder-type" className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {folderTypes.map((type) => (
                                                            <SelectItem key={type.id} value={type.id}>
                                                                {type.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button 
                                                onClick={handleCreateFolder} 
                                                className="w-full h-8"
                                                disabled={!newFolderName.trim()}
                                            >
                                                <FolderPlus className="h-3.5 w-3.5 mr-2" />
                                                Create Folder
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search notes and folders..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="h-8 pl-8 text-sm"
                    />
                </div>

                {/* Tag Filter (Collapsible) */}
                {showTagFilter && (
                    <div className="pt-1">
                        <TagFilter className="w-full" />
                    </div>
                )}
            </div>

                {/* Folder Tree */}
                <div className="flex-1 overflow-y-auto">
                    <FolderTree
                        notes={notes}
                        folders={folders}
                        selectedNoteId={selectedNoteId}
                        selectedFolderId={selectedFolderId}
                        onSelectNote={handleNoteSelect}
                        onSelectFolder={handleFolderSelect}
                        onAddFolder={() => setIsNewFolderOpen(true)}
                        onDeleteNote={handleNoteDelete}
                        onDeleteFolder={handleDeleteFolder}
                        onRenameNote={(noteId, newTitle) => {
                            // Select the note first, then update its title
                            const note = notes.find(n => n.id === noteId);
                            if (note) {
                                handleNoteSelect(noteId);
                                // Small delay to ensure selection completes
                                setTimeout(() => {
                                    handleNoteChange({ title: newTitle });
                                }, 50);
                            }
                        }}
                        onRenameFolder={(folderId, newName) => {
                            // Find the folder and update it
                            const folder = folders.find(f => f.id === folderId);
                            if (folder) {
                                handleUpdateFolder({ ...folder, name: newName });
                            }
                        }}
                        searchTerm={searchTerm}
                    />
                </div>

                {/* Footer Stats - Only render on client to avoid hydration errors */}
                {mounted && (
                    <div className="p-3 border-t border-border/50 dark:border-border/30">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{folders.length} folders</span>
                            <span>{notes.length} notes</span>
                        </div>
                    </div>
                )}
            </div>
    );
};

