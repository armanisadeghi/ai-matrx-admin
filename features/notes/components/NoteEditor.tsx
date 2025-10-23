// features/notes/components/NoteEditor.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Save, Clock, Loader2, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { TagInput } from './TagInput';
import type { Note } from '../types';
import { useAutoSave } from '../hooks/useAutoSave';
import { cn } from '@/lib/utils';
import { useToastManager } from '@/hooks/useToastManager';

interface NoteEditorProps {
    note: Note | null;
    onUpdate?: (noteId: string, updates: Partial<Note>) => void;
    allNotes?: Note[];
    className?: string;
}

export function NoteEditor({ note, onUpdate, allNotes = [], className }: NoteEditorProps) {
    const [localLabel, setLocalLabel] = useState(note?.label || '');
    const [localContent, setLocalContent] = useState(note?.content || '');
    const [localFolder, setLocalFolder] = useState(note?.folder_name || 'General');
    const [localTags, setLocalTags] = useState<string[]>(note?.tags || []);
    const toast = useToastManager('notes');

    // Extract unique folder names from all notes
    const availableFolders = useMemo(() => {
        const folders = new Set(allNotes.map(n => n.folder_name));
        return Array.from(folders).sort();
    }, [allNotes]);

    const { isDirty, isSaving, lastSaved, updateWithAutoSave, forceSave } = useAutoSave({
        noteId: note?.id || null,
        debounceMs: 1000,
        onSaveSuccess: () => {
            // Notify parent with all updated fields
            if (note) {
                onUpdate?.(note.id, { 
                    label: localLabel, 
                    content: localContent,
                    folder_name: localFolder,
                    tags: localTags,
                });
            }
        },
    });

    // Update local state when note changes
    useEffect(() => {
        if (note) {
            setLocalLabel(note.label);
            setLocalContent(note.content);
            setLocalFolder(note.folder_name);
            setLocalTags(note.tags || []);
        }
    }, [note?.id]); // Only update when note ID changes

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLabel = e.target.value;
        setLocalLabel(newLabel);
        updateWithAutoSave({ label: newLabel });
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setLocalContent(newContent);
        updateWithAutoSave({ content: newContent });
    };

    const handleLabelBlur = () => {
        forceSave();
    };

    const handleFolderChange = (newFolder: string) => {
        setLocalFolder(newFolder);
        updateWithAutoSave({ folder_name: newFolder });
        
        // Immediately notify parent of folder change for UI update
        if (note) {
            onUpdate?.(note.id, { folder_name: newFolder });
        }
        
        toast.success(`Moved to "${newFolder}"`);
    };

    const handleTagsChange = (newTags: string[]) => {
        setLocalTags(newTags);
        updateWithAutoSave({ tags: newTags });
        
        // Immediately notify parent of tag change for UI update
        if (note) {
            onUpdate?.(note.id, { tags: newTags });
        }
    };

    if (!note) {
        return (
            <div className={cn("flex items-center justify-center h-full bg-textured", className)}>
                <div className="text-center text-zinc-500 dark:text-zinc-400">
                    <p>No note selected</p>
                    <p className="text-sm mt-2">Create or select a note to get started</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full bg-white dark:bg-zinc-850", className)}>
            {/* Header - Better horizontal layout */}
            <div className="flex flex-col gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
                {/* Top row: Title and Status */}
                <div className="flex items-center justify-between gap-3">
                    <Input
                        type="text"
                        value={localLabel}
                        onChange={handleLabelChange}
                        onBlur={handleLabelBlur}
                        className="text-xs border-none shadow-none focus-visible:ring-0 px-1 bg-transparent h-6 flex-1"
                        placeholder="Note title..."
                    />
                    
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isSaving && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Saving
                            </Badge>
                        )}
                        
                        {!isSaving && isDirty && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                <Clock className="h-3 w-3 mr-1" />
                                Unsaved
                            </Badge>
                        )}
                        
                        {!isSaving && !isDirty && lastSaved && (
                            <Badge variant="outline" className="text-xs h-5 px-1.5 text-zinc-500 dark:text-zinc-400">
                                <Save className="h-3 w-3 mr-1" />
                                Saved
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Bottom row: Folder and Tags */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-zinc-400" />
                        <Select value={localFolder} onValueChange={handleFolderChange}>
                            <SelectTrigger className="h-6 text-xs border bg-zinc-100 dark:bg-zinc-800 px-2 w-auto min-w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableFolders.map((folder) => (
                                    <SelectItem key={folder} value={folder} className="text-xs">
                                        {folder}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <TagInput
                        tags={localTags}
                        onChange={handleTagsChange}
                        className="flex-1"
                    />
                </div>
            </div>

            {/* Content editor - Full height without scrollable container */}
            <div className="flex-1 relative overflow-hidden">
                <Textarea
                    value={localContent}
                    onChange={handleContentChange}
                    placeholder="Start typing your note..."
                    className="absolute inset-0 w-full h-full resize-none border-0 focus-visible:ring-0 text-sm leading-relaxed bg-transparent p-3"
                />
            </div>
        </div>
    );
}

