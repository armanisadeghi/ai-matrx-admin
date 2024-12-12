// components/notes-app/layout/FoldersSidebar.tsx
'use client';

import { useNotesManager } from '@/hooks/notes-app/useNotesManager';
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
            <div className="pt-3 px-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <h2 className="font-medium uppercase tracking-wider">Folders</h2>
                    <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4">
                                <Plus className="h-3 w-3" />
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
                                <Button onClick={handleCreateFolder}>
                                    Create Folder
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder="Search folders & notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-7 pl-7 text-xs"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto mt-3">
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
