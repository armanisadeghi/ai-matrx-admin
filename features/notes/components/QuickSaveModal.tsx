// features/notes/components/QuickSaveModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Save } from 'lucide-react';
import { NotesAPI } from '../service/notesApi';
import { useToastManager } from '@/hooks/useToastManager';
import { DEFAULT_FOLDER_NAMES } from '../constants/defaultFolders';

interface QuickSaveModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialContent: string;
    defaultFolder?: string;
    onSaved?: () => void;
}

/**
 * Quick modal for editing and saving content to notes
 * Allows content editing and folder selection before saving
 */
export function QuickSaveModal({
    open,
    onOpenChange,
    initialContent,
    defaultFolder = 'Scratch',
    onSaved,
}: QuickSaveModalProps) {
    const [content, setContent] = useState(initialContent);
    const [folder, setFolder] = useState(defaultFolder);
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToastManager('notes');

    // Reset content when modal opens
    useEffect(() => {
        if (open) {
            setContent(initialContent);
            setFolder(defaultFolder);
        }
    }, [open, initialContent, defaultFolder]);

    const handleSave = async () => {
        if (!content.trim()) {
            toast.error('Content cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            await NotesAPI.create({
                label: 'New Note',
                content: content.trim(),
                folder_name: folder,
                tags: [],
            });

            toast.success(`Saved to ${folder}!`);
            onOpenChange(false);
            onSaved?.();
        } catch (error) {
            console.error('Error saving note:', error);
            toast.error('Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Quick Save to Notes</DialogTitle>
                    <DialogDescription>
                        Edit your content and choose a folder before saving.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="folder">Folder</Label>
                        <Select value={folder} onValueChange={setFolder}>
                            <SelectTrigger id="folder">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DEFAULT_FOLDER_NAMES.map((folderName) => (
                                    <SelectItem key={folderName} value={folderName}>
                                        {folderName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter your note content..."
                            className="min-h-[200px] resize-none"
                            autoFocus
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !content.trim()}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Note'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

