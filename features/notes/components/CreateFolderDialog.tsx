// features/notes/components/CreateFolderDialog.tsx
"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface CreateFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (folderName: string) => void;
    existingFolders?: string[];
}

export function CreateFolderDialog({
    open,
    onOpenChange,
    onConfirm,
    existingFolders = [],
}: CreateFolderDialogProps) {
    const [folderName, setFolderName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const trimmedName = folderName.trim();
        
        if (!trimmedName) {
            setError('Folder name cannot be empty');
            return;
        }
        
        if (existingFolders.includes(trimmedName)) {
            setError('A folder with this name already exists');
            return;
        }
        
        onConfirm(trimmedName);
        setFolderName('');
        setError('');
        onOpenChange(false);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setFolderName('');
            setError('');
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                        Enter a name for your new folder. This will help you organize your notes.
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="folder-name">Folder Name</Label>
                            <Input
                                id="folder-name"
                                value={folderName}
                                onChange={(e) => {
                                    setFolderName(e.target.value);
                                    setError('');
                                }}
                                placeholder="e.g., Work, Personal, Ideas"
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-500 dark:text-red-400">
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            Create Folder
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

