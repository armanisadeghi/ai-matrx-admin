// features/notes/components/QuickSaveModal.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, AlertTriangle, FilePlus, FileEdit } from 'lucide-react';
import { NotesAPI } from '../service/notesApi';
import { useToastManager } from '@/hooks/useToastManager';
import { useNotes } from '../hooks/useNotes';
import type { Note } from '../types';

interface QuickSaveModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialContent: string;
    defaultFolder?: string;
    onSaved?: () => void;
}

type SaveMode = 'create' | 'update';
type UpdateMethod = 'append' | 'overwrite';

/**
 * Generate a default note name with timestamp
 */
function generateDefaultNoteName(): string {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `Quick Note - ${date} at ${time}`;
}

/**
 * Enhanced quick save modal with support for:
 * - Custom note names with smart defaults
 * - All available folders (not just defaults)
 * - Create new or update existing notes
 * - Append or overwrite when updating
 * - Warnings before destructive actions
 */
export function QuickSaveModal({
    open,
    onOpenChange,
    initialContent,
    defaultFolder = 'Scratch',
    onSaved,
}: QuickSaveModalProps) {
    const [content, setContent] = useState(initialContent);
    const [noteName, setNoteName] = useState(generateDefaultNoteName());
    const [folder, setFolder] = useState(defaultFolder);
    const [saveMode, setSaveMode] = useState<SaveMode>('create');
    const [selectedNoteId, setSelectedNoteId] = useState<string>('');
    const [updateMethod, setUpdateMethod] = useState<UpdateMethod>('append');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const toast = useToastManager('notes');
    const { notes, isLoading: isLoadingNotes } = useNotes();

    // Get all unique folders from user's notes
    const allFolders = useMemo(() => {
        const folderSet = new Set<string>();
        notes.forEach(note => {
            if (note.folder_name) {
                folderSet.add(note.folder_name);
            }
        });
        return Array.from(folderSet).sort();
    }, [notes]);

    // Get notes for selected folder
    const notesInFolder = useMemo(() => {
        return notes.filter(note => note.folder_name === folder);
    }, [notes, folder]);

    // Get selected note details
    const selectedNote = useMemo(() => {
        return notes.find(note => note.id === selectedNoteId);
    }, [notes, selectedNoteId]);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setContent(initialContent);
            setNoteName(generateDefaultNoteName());
            setFolder(defaultFolder);
            setSaveMode('create');
            setSelectedNoteId('');
            setUpdateMethod('append');
            setShowAdvanced(false);
        }
    }, [open, initialContent, defaultFolder]);

    // Reset selected note when folder or mode changes
    useEffect(() => {
        setSelectedNoteId('');
    }, [folder, saveMode]);

    const handleSave = async () => {
        if (!content.trim()) {
            toast.error('Content cannot be empty');
            return;
        }

        // Check if overwriting and show warning
        if (saveMode === 'update' && updateMethod === 'overwrite') {
            setShowOverwriteWarning(true);
            return;
        }

        await executeSave();
    };

    const executeSave = async () => {
        setIsSaving(true);
        try {
            if (saveMode === 'create') {
                // Create new note
                await NotesAPI.create({
                    label: noteName.trim() || 'Quick Note',
                    content: content.trim(),
                    folder_name: folder,
                    tags: [],
                });
                toast.success(`Created in ${folder}!`);
            } else {
                // Update existing note
                if (!selectedNoteId) {
                    toast.error('Please select a note to update');
                    return;
                }

                const finalContent = updateMethod === 'append' && selectedNote
                    ? `${selectedNote.content}\n\n${content.trim()}`
                    : content.trim();

                await NotesAPI.update(selectedNoteId, {
                    content: finalContent,
                });

                const methodText = updateMethod === 'append' ? 'appended to' : 'overwrote';
                toast.success(`Content ${methodText} ${selectedNote?.label || 'note'}!`);
            }

            onOpenChange(false);
            onSaved?.();
        } catch (error) {
            console.error('Error saving note:', error);
            toast.error('Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOverwriteConfirm = async () => {
        setShowOverwriteWarning(false);
        await executeSave();
    };

    const isSaveDisabled = 
        isSaving || 
        !content.trim() || 
        (saveMode === 'update' && !selectedNoteId);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Quick Save to Notes</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Mode Selection - Toggle Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={saveMode === 'create' ? 'default' : 'outline'}
                                onClick={() => setSaveMode('create')}
                                className="h-12 w-full border border-border rounded-md"
                            >
                                <FilePlus className="h-4 w-4 mr-2" />
                                Create New Note
                            </Button>
                            <Button
                                type="button"
                                variant={saveMode === 'update' ? 'default' : 'outline'}
                                onClick={() => setSaveMode('update')}
                                className="h-12 w-full border border-border rounded-md"
                            >
                                <FileEdit className="h-4 w-4 mr-2" />
                                Update Existing
                            </Button>
                        </div>

                        {/* Folder Selection */}
                        <div className="grid gap-2">
                            <Label htmlFor="folder">Folder</Label>
                            <Select value={folder} onValueChange={setFolder}>
                                <SelectTrigger id="folder">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {allFolders.length > 0 ? (
                                        allFolders.map((folderName) => (
                                            <SelectItem key={folderName} value={folderName}>
                                                {folderName}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value={defaultFolder}>{defaultFolder}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Note Name (Create Mode) */}
                        {saveMode === 'create' && (
                            <div className="grid gap-2">
                                <Label htmlFor="note-name">Note Name</Label>
                                <Input
                                    id="note-name"
                                    value={noteName}
                                    onChange={(e) => setNoteName(e.target.value)}
                                    placeholder="Enter note name..."
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                        )}

                        {/* Note Selection (Update Mode) */}
                        {saveMode === 'update' && (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="note-select">Select Note</Label>
                                    <Select value={selectedNoteId} onValueChange={setSelectedNoteId}>
                                        <SelectTrigger id="note-select">
                                            <SelectValue placeholder="Choose a note to update..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {notesInFolder.length > 0 ? (
                                                notesInFolder.map((note) => (
                                                    <SelectItem key={note.id} value={note.id}>
                                                        {note.label}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>
                                                    No notes in this folder
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Update Method */}
                                {selectedNoteId && (
                                    <div className="grid gap-2">
                                        <Label>Update Method</Label>
                                        <RadioGroup 
                                            value={updateMethod} 
                                            onValueChange={(value) => setUpdateMethod(value as UpdateMethod)}
                                            className="grid gap-2"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="append" id="method-append" />
                                                <Label htmlFor="method-append" className="cursor-pointer font-normal">
                                                    Append to end (keeps existing content)
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2 gap-2">
                                                <RadioGroupItem value="overwrite" id="method-overwrite" />
                                                <Label htmlFor="method-overwrite" className="cursor-pointer font-normal flex items-center gap-2">
                                                    Overwrite completely
                                                    {updateMethod === 'overwrite' && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Warning
                                                        </Badge>
                                                    )}
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Content */}
                        <div className="grid gap-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Enter your note content..."
                                className="min-h-[200px] resize-none text-sm"
                                style={{ fontSize: '14px' }}
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
                            disabled={isSaveDisabled}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : saveMode === 'create' ? 'Save Note' : 'Update Note'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Overwrite Warning Dialog */}
            <AlertDialog open={showOverwriteWarning} onOpenChange={setShowOverwriteWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Confirm Overwrite
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to completely replace the content of <strong>{selectedNote?.label}</strong>.
                            This action cannot be undone. Are you sure you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleOverwriteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Overwrite Note
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

