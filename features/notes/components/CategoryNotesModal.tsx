'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
    Search, 
    Plus, 
    Pencil, 
    Trash2, 
    FileText,
    Check,
    X,
    Loader2
} from 'lucide-react';
import { useNotesContext } from '../context/NotesContext';
import type { Note } from '../types';
import { toast } from 'sonner';
import { getFolderIconAndColor } from '../utils/folderUtils';

export interface CategoryNotesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryName: string;
    onSelectNote?: (note: Note) => void;
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
    selectButtonLabel?: string;
    title?: string;
    description?: string;
}

export function CategoryNotesModal({
    open,
    onOpenChange,
    categoryName,
    onSelectNote,
    allowCreate = true,
    allowEdit = true,
    allowDelete = true,
    selectButtonLabel = 'Use',
    title,
    description,
}: CategoryNotesModalProps) {
    const { notes, createNote, updateNote, deleteNote, isLoading } = useNotesContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [newNoteLabel, setNewNoteLabel] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [editNoteLabel, setEditNoteLabel] = useState('');
    const [editNoteContent, setEditNoteContent] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Get category icon and color
    const { icon: CategoryIcon, color: categoryColor } = getFolderIconAndColor(categoryName);

    // Filter notes by category
    const categoryNotes = useMemo(() => {
        return notes.filter(note => note.folder_name === categoryName);
    }, [notes, categoryName]);

    // Search within category notes
    const filteredNotes = useMemo(() => {
        if (!searchQuery.trim()) return categoryNotes;
        
        const query = searchQuery.toLowerCase();
        return categoryNotes.filter(note =>
            note.label.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        );
    }, [categoryNotes, searchQuery]);

    // Sort by updated_at descending
    const sortedNotes = useMemo(() => {
        return [...filteredNotes].sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }, [filteredNotes]);

    const handleCreate = async () => {
        if (!newNoteContent.trim()) {
            toast.error('Content is required');
            return;
        }

        setActionLoading(true);
        try {
            await createNote({
                label: newNoteLabel.trim() || undefined, // Let auto-labeling work if empty
                content: newNoteContent.trim(),
                folder_name: categoryName,
            });
            
            toast.success('Note created successfully');
            setIsCreating(false);
            setNewNoteLabel('');
            setNewNoteContent('');
        } catch (error) {
            console.error('Error creating note:', error);
            toast.error('Failed to create note');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartEdit = (note: Note) => {
        setEditingNoteId(note.id);
        setEditNoteLabel(note.label);
        setEditNoteContent(note.content);
    };

    const handleSaveEdit = async () => {
        if (!editingNoteId || !editNoteContent.trim()) {
            toast.error('Content is required');
            return;
        }

        setActionLoading(true);
        try {
            await updateNote(editingNoteId, {
                label: editNoteLabel.trim() || undefined,
                content: editNoteContent.trim(),
            });
            
            toast.success('Note updated successfully');
            setEditingNoteId(null);
            setEditNoteLabel('');
            setEditNoteContent('');
        } catch (error) {
            console.error('Error updating note:', error);
            toast.error('Failed to update note');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingNoteId(null);
        setEditNoteLabel('');
        setEditNoteContent('');
    };

    const handleDelete = async (noteId: string) => {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }

        setActionLoading(true);
        try {
            await deleteNote(noteId);
            toast.success('Note deleted successfully');
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error('Failed to delete note');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSelect = (note: Note) => {
        onSelectNote?.(note);
        toast.success(`${selectButtonLabel}: ${note.label}`);
    };

    const displayTitle = title || `${categoryName} Notes`;
    const displayDescription = description || `Manage your ${categoryName.toLowerCase()} notes`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CategoryIcon className={`h-5 w-5 ${categoryColor}`} />
                        {displayTitle}
                    </DialogTitle>
                    <DialogDescription>{displayDescription}</DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    {/* Search and Create */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        {allowCreate && !isCreating && (
                            <Button onClick={() => setIsCreating(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                New
                            </Button>
                        )}
                    </div>

                    {/* Create Form */}
                    {isCreating && (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
                            <Input
                                placeholder="Note title (optional - auto-generated from content)"
                                value={newNoteLabel}
                                onChange={(e) => setNewNoteLabel(e.target.value)}
                            />
                            <Textarea
                                placeholder="Note content..."
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                rows={4}
                                className="resize-none font-mono text-sm"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsCreating(false);
                                        setNewNoteLabel('');
                                        setNewNoteContent('');
                                    }}
                                    disabled={actionLoading}
                                >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                                <Button onClick={handleCreate} disabled={actionLoading}>
                                    {actionLoading ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                    )}
                                    Create
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Notes List */}
                    <ScrollArea className="flex-1 -mr-4 pr-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        ) : sortedNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                                <p className="text-slate-500 dark:text-slate-400">
                                    {searchQuery ? 'No notes found' : `No ${categoryName.toLowerCase()} notes yet`}
                                </p>
                                {allowCreate && !searchQuery && (
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => setIsCreating(true)}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create your first note
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {sortedNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                    >
                                        {editingNoteId === note.id ? (
                                            <div className="space-y-3">
                                                <Input
                                                    placeholder="Note title (optional)"
                                                    value={editNoteLabel}
                                                    onChange={(e) => setEditNoteLabel(e.target.value)}
                                                />
                                                <Textarea
                                                    placeholder="Note content..."
                                                    value={editNoteContent}
                                                    onChange={(e) => setEditNoteContent(e.target.value)}
                                                    rows={6}
                                                    className="resize-none font-mono text-sm"
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleCancelEdit}
                                                        disabled={actionLoading}
                                                    >
                                                        <X className="h-4 w-4 mr-2" />
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleSaveEdit}
                                                        disabled={actionLoading}
                                                    >
                                                        {actionLoading ? (
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Check className="h-4 w-4 mr-2" />
                                                        )}
                                                        Save
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                                            {note.label}
                                                        </h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            {new Date(note.updated_at).toLocaleDateString()} at{' '}
                                                            {new Date(note.updated_at).toLocaleTimeString([], { 
                                                                hour: '2-digit', 
                                                                minute: '2-digit' 
                                                            })}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {onSelectNote && (
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={() => handleSelect(note)}
                                                            >
                                                                {selectButtonLabel}
                                                            </Button>
                                                        )}
                                                        {allowEdit && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleStartEdit(note)}
                                                                disabled={actionLoading}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {allowDelete && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDelete(note.id)}
                                                                disabled={actionLoading}
                                                                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-3 font-mono bg-slate-100 dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                                                    {note.content}
                                                </div>
                                                {note.tags && note.tags.length > 0 && (
                                                    <div className="flex gap-1 mt-2 flex-wrap">
                                                        {note.tags.map((tag) => (
                                                            <Badge
                                                                key={tag}
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

