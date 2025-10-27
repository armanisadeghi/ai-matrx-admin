// features/notes/components/NoteEditor.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Save, Clock, Loader2, FolderOpen, FileText, PilcrowRight, Eye, SplitSquareHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/ButtonMine';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useAllFolders } from '../utils/folderUtils';
import { cn } from '@/lib/utils';
import { useToastManager } from '@/hooks/useToastManager';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';

// Dynamic import for TUI editor (only loads when needed)
const TuiEditorContent = dynamic(
    () => import('@/components/mardown-display/chat-markdown/tui/TuiEditorContent'),
    { 
        ssr: false, 
        loading: () => (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            </div>
        ) 
    }
);

type EditorMode = 'plain' | 'wysiwyg' | 'markdown' | 'preview';

interface NoteEditorProps {
    note: Note | null;
    onUpdate?: (noteId: string, updates: Partial<Note>) => void;
    allNotes?: Note[];
    className?: string;
}

export function NoteEditor({ note, onUpdate, allNotes = [], className }: NoteEditorProps) {
    const [localContent, setLocalContent] = useState(note?.content || '');
    const [localFolder, setLocalFolder] = useState(note?.folder_name || 'Draft');
    const [localTags, setLocalTags] = useState<string[]>(note?.tags || []);
    const [editorMode, setEditorMode] = useState<EditorMode>('plain');
    const tuiEditorRef = useRef<any>(null);
    const toast = useToastManager('notes');
    
    // Use refs to avoid callback dependencies
    const localContentRef = useRef(localContent);
    const localFolderRef = useRef(localFolder);
    const localTagsRef = useRef(localTags);
    const editorModeRef = useRef(editorMode);
    const noteRef = useRef(note);
    
    // Keep refs in sync
    useEffect(() => {
        localContentRef.current = localContent;
        localFolderRef.current = localFolder;
        localTagsRef.current = localTags;
        editorModeRef.current = editorMode;
        noteRef.current = note;
    }, [localContent, localFolder, localTags, editorMode, note]);

    // Get all folders (default + custom) - optimized to only recalculate when folder names change
    const availableFolders = useAllFolders(allNotes);

    // Load editor mode from note metadata
    useEffect(() => {
        if (note?.metadata?.lastEditorMode) {
            setEditorMode(note.metadata.lastEditorMode as EditorMode);
        } else {
            setEditorMode('plain');
        }
    }, [note?.id]); // Only change when note ID changes

    const { isDirty, isSaving, lastSaved, updateWithAutoSave, forceSave } = useAutoSave({
        noteId: note?.id || null,
        debounceMs: 1000,
        onSaveSuccess: () => {
            // Notify parent with all updated fields + editor mode
            if (note) {
                onUpdate?.(note.id, { 
                    label: note.label, 
                    content: localContent, 
                    folder_name: localFolder, 
                    tags: localTags,
                    metadata: {
                        ...note.metadata,
                        lastEditorMode: editorMode
                    }
                });
            }
        },
    });

    // Sync local state when note changes
    useEffect(() => {
        if (note) {
            setLocalContent(note.content);
            setLocalFolder(note.folder_name || 'Draft');
            setLocalTags(note.tags || []);
        }
    }, [note?.id]); // Only reset when note ID changes

    // REMOVED - No longer needed since handleModeChange handles content sync directly

    // Handle mode change - INSTANT, no database interaction
    const handleModeChange = useCallback((newMode: EditorMode) => {
        // Sync content before switching (but don't trigger save)
        const currentMode = editorModeRef.current;
        if ((currentMode === 'wysiwyg' || currentMode === 'markdown') && tuiEditorRef.current?.getCurrentMarkdown) {
            const markdown = tuiEditorRef.current.getCurrentMarkdown();
            if (markdown !== localContentRef.current) {
                setLocalContent(markdown);
            }
        }
        
        // Simply update the editor mode - that's it!
        setEditorMode(newMode);
        
        // Note: The editor mode will be saved automatically when the note is next saved
        // for other reasons (content, folder, tags). No need to trigger a save just for view mode.
    }, []); // No dependencies - stable function

    const handleContentChange = (value: string) => {
        setLocalContent(value);
        if (note) {
            updateWithAutoSave({ 
                label: note.label, 
                content: value, 
                folder_name: localFolder, 
                tags: localTags,
                metadata: { ...note.metadata, lastEditorMode: editorMode } // Include mode in actual content saves
            });
        }
    };

    const handleTuiChange = useCallback((value: string) => {
        setLocalContent(value);
        const currentNote = noteRef.current;
        if (currentNote) {
            updateWithAutoSave({ 
                label: currentNote.label, 
                content: value, 
                folder_name: localFolderRef.current, 
                tags: localTagsRef.current,
                metadata: { ...currentNote.metadata, lastEditorMode: editorModeRef.current }
            });
        }
    }, [updateWithAutoSave]); // Only depends on updateWithAutoSave

    const handleFolderChange = (value: string) => {
        setLocalFolder(value);
        if (note) {
            updateWithAutoSave({ 
                label: note.label, 
                content: localContent, 
                folder_name: value, 
                tags: localTags,
                metadata: { ...note.metadata, lastEditorMode: editorMode } // Include mode
            });
            // Immediate update to parent for sidebar refresh
            onUpdate?.(note.id, { folder_name: value });
        }
    };

    const handleTagsChange = (tags: string[]) => {
        setLocalTags(tags);
        if (note) {
            updateWithAutoSave({ 
                label: note.label, 
                content: localContent, 
                folder_name: localFolder, 
                tags,
                metadata: { ...note.metadata, lastEditorMode: editorMode } // Include mode
            });
            // Immediate update to parent
            onUpdate?.(note.id, { tags });
        }
    };

    if (!note) {
        return (
            <div className={cn(
                "flex-1 flex items-center justify-center",
                "h-full bg-textured",
                className
            )}>
                <div className="text-center text-zinc-400 dark:text-zinc-500">
                    <p className="text-lg">No note selected</p>
                    <p className="text-sm mt-2">Select a note or create a new one</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full bg-textured", className)}>
            {/* Header - Metadata only (title is now in tabs) */}
            <div className="flex-none border-b border-zinc-200 dark:border-zinc-800 bg-textured">
                {/* Folder, Tags, Status */}
                <div className="flex items-center gap-2 px-3 py-2">
                    {/* Folder Selector */}
                    <Select value={localFolder} onValueChange={handleFolderChange}>
                        <SelectTrigger className="w-[140px] h-7 text-xs">
                            <div className="flex items-center gap-1.5">
                                <FolderOpen className="h-3 w-3" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {availableFolders.map((folder) => (
                                <SelectItem key={folder} value={folder} className="text-xs">
                                    {folder}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Tags */}
                    <div className="flex-1 min-w-0">
                        <TagInput
                            tags={localTags}
                            onChange={handleTagsChange}
                            className="h-7 text-xs"
                        />
                    </div>

                    {/* Status indicators */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {isSaving && (
                            <div className="flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Saving...</span>
                            </div>
                        )}
                        {!isSaving && isDirty && (
                            <div className="flex items-center gap-1">
                                <Save className="h-3 w-3" />
                                <span>Unsaved</span>
                            </div>
                        )}
                        {!isSaving && !isDirty && lastSaved && (
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Saved</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor Area with Floating Mode Buttons */}
            <div className="flex-1 relative overflow-hidden bg-textured">
                {/* Floating Mode Switcher */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-0 p-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={editorMode === 'plain' ? 'outline' : 'ghost'}
                                    size="icon"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleModeChange('plain')}
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Plain Text</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={editorMode === 'wysiwyg' ? 'outline' : 'ghost'}
                                    size="icon"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleModeChange('wysiwyg')}
                                >
                                    <PilcrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Rich Editor (WYSIWYG)</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={editorMode === 'markdown' ? 'outline' : 'ghost'}
                                    size="icon"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleModeChange('markdown')}
                                >
                                    <SplitSquareHorizontal className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Markdown Split View</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={editorMode === 'preview' ? 'outline' : 'ghost'}
                                    size="icon"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleModeChange('preview')}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Editor Content */}
                {editorMode === 'plain' && (
                    <Textarea
                        value={localContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder="Start typing your note..."
                        className="absolute inset-0 w-full h-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm leading-relaxed bg-transparent p-3"
                    />
                )}

                {editorMode === 'wysiwyg' && (
                    <div className="absolute inset-0 w-full h-full">
                        <TuiEditorContent
                            ref={tuiEditorRef}
                            content={localContent}
                            onChange={handleTuiChange}
                            isActive={true}
                            editMode="wysiwyg"
                            className="w-full h-full"
                        />
                    </div>
                )}

                {editorMode === 'markdown' && (
                    <div className="absolute inset-0 w-full h-full">
                        <TuiEditorContent
                            ref={tuiEditorRef}
                            content={localContent}
                            onChange={handleTuiChange}
                            isActive={true}
                            editMode="markdown"
                            className="w-full h-full"
                        />
                    </div>
                )}

                {editorMode === 'preview' && (
                    <ScrollArea className="absolute inset-0 w-full h-full">
                        <div className="p-6 bg-textured">
                            {localContent.trim() ? (
                                <EnhancedChatMarkdown content={localContent} />
                            ) : (
                                <div className="text-center py-12 text-zinc-400 dark:text-zinc-500">
                                    No content to preview
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}
