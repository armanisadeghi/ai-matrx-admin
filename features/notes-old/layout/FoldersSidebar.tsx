// components/notes-app/layout/FoldersSidebar.tsx
'use client';

import { FolderTree } from '../folders/FolderTree';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { folderTypes } from '../folders/folder-categories';

export const FoldersSidebar = () => {
    const {
        notes,
        folders,
        selectedNoteId,
        selectedFolderId,
        handleNoteSelect,
        handleFolderSelect,
        handleAddFolder,
    } = useNotesManager();

    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderType, setNewFolderType] = useState('general');
    const [searchTerm, setSearchTerm] = useState('');

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            handleAddFolder({
                name: newFolderName.trim(),
                type: newFolderType,
                parentId: selectedFolderId,
            });
            setNewFolderName('');
            setNewFolderType('general');
            setIsNewFolderDialogOpen(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header Section */}
            <div className="p-3 border-b border-border/50 dark:border-border/30">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
                        Folders
                    </h2>
                    <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
                        <DialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 hover:bg-accent dark:hover:bg-accent"
                                title="New Folder"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Folder</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <Input
                                    placeholder="Folder name"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCreateFolder();
                                        }
                                    }}
                                />
                                <Select
                                    value={newFolderType}
                                    onValueChange={(value) => setNewFolderType(value)}
                                >
                                    {folderTypes.map((type) => (
                                        <option key={type.id} value={type.id}>
                                            {type.label}
                                        </option>
                                    ))}
                                </Select>
                                <Button onClick={handleCreateFolder} className="w-full">
                                    Create Folder
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                
                {/* Search Input */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search folders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 pl-8 text-sm"
                    />
                </div>
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
                    onAddFolder={() => setIsNewFolderDialogOpen(true)}
                    searchTerm={searchTerm}
                />
            </div>
        </div>
    );
};
