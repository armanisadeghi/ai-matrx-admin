'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    Loader2,
    ChevronLeft,
    Menu
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
    allowImport?: boolean;
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
    allowImport = true,
    selectButtonLabel = 'Use',
    title,
    description,
}: CategoryNotesModalProps) {
    const { notes, createNote, updateNote, deleteNote, isLoading } = useNotesContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'import'>('list');
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [importSearchQuery, setImportSearchQuery] = useState('');
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [newNoteLabel, setNewNoteLabel] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [editNoteLabel, setEditNoteLabel] = useState('');
    const [editNoteContent, setEditNoteContent] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Get category icon and color
    const { icon: CategoryIcon, color: categoryColor } = getFolderIconAndColor(categoryName);

    // Filter notes by category
    const categoryNotes = useMemo(() => {
        return notes.filter(note => note.folder_name === categoryName);
    }, [notes, categoryName]);

    // Get all notes from other categories for import
    const otherNotes = useMemo(() => {
        return notes.filter(note => note.folder_name !== categoryName);
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

    // Search within other notes for import
    const filteredImportNotes = useMemo(() => {
        if (!importSearchQuery.trim()) return otherNotes;
        
        const query = importSearchQuery.toLowerCase();
        return otherNotes.filter(note =>
            note.label.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query) ||
            note.folder_name.toLowerCase().includes(query)
        );
    }, [otherNotes, importSearchQuery]);

    // Sort by updated_at descending
    const sortedNotes = useMemo(() => {
        return [...filteredNotes].sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }, [filteredNotes]);

    const sortedImportNotes = useMemo(() => {
        return [...filteredImportNotes].sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }, [filteredImportNotes]);

    // Get selected note
    const selectedNote = useMemo(() => {
        if (!selectedNoteId) return null;
        return categoryNotes.find(n => n.id === selectedNoteId) || null;
    }, [selectedNoteId, categoryNotes]);

    const handleCreate = async () => {
        if (!newNoteContent.trim()) {
            toast.error('Content is required');
            return;
        }

        setActionLoading(true);
        try {
            const newNote = await createNote({
                label: newNoteLabel.trim() || undefined,
                content: newNoteContent.trim(),
                folder_name: categoryName,
            });
            
            toast.success('Created successfully');
            setViewMode('list');
            setSelectedNoteId(newNote.id);
            setNewNoteLabel('');
            setNewNoteContent('');
        } catch (error) {
            console.error('Error creating:', error);
            toast.error('Failed to create');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartEdit = (note: Note) => {
        setEditingNote(note);
        setEditNoteLabel(note.label);
        setEditNoteContent(note.content);
        setViewMode('edit');
    };

    const handleSaveEdit = async () => {
        if (!editingNote || !editNoteContent.trim()) {
            toast.error('Content is required');
            return;
        }

        setActionLoading(true);
        try {
            await updateNote(editingNote.id, {
                label: editNoteLabel.trim() || undefined,
                content: editNoteContent.trim(),
            });
            
            toast.success('Updated successfully');
            setViewMode('list');
            setSelectedNoteId(editingNote.id);
            setEditingNote(null);
            setEditNoteLabel('');
            setEditNoteContent('');
        } catch (error) {
            console.error('Error updating:', error);
            toast.error('Failed to update');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setViewMode('list');
        setEditingNote(null);
        setEditNoteLabel('');
        setEditNoteContent('');
    };

    const handleDelete = async (noteId: string) => {
        if (!confirm('Are you sure you want to delete this?')) {
            return;
        }

        setActionLoading(true);
        try {
            await deleteNote(noteId);
            toast.success('Deleted successfully');
            if (selectedNoteId === noteId) {
                setSelectedNoteId(null);
            }
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Failed to delete');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSelect = (note: Note) => {
        onSelectNote?.(note);
        toast.success(`${selectButtonLabel}: ${note.label}`);
    };

    const handleImport = async (sourceNote: Note) => {
        setActionLoading(true);
        try {
            const imported = await createNote({
                label: sourceNote.label,
                content: sourceNote.content,
                folder_name: categoryName,
                tags: sourceNote.tags,
            });
            
            toast.success(`Imported: ${sourceNote.label}`);
            setViewMode('list');
            setSelectedNoteId(imported.id);
            setImportSearchQuery('');
        } catch (error) {
            console.error('Error importing:', error);
            toast.error('Failed to import');
        } finally {
            setActionLoading(false);
        }
    };

    const displayTitle = title || categoryName;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full md:w-[1400px] max-h-[90vh] h-[90vh] flex flex-col p-0">
                {/* Header */}
                <DialogHeader className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center justify-between pr-8">
                        <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                            <CategoryIcon className={`h-5 w-5 ${categoryColor}`} />
                            {displayTitle}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            {viewMode !== 'list' && (
                                <Button onClick={() => setViewMode('list')} variant="ghost" size="sm">
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Back
                                </Button>
                            )}
                            {allowCreate && viewMode === 'list' && (
                                <Button onClick={() => {setViewMode('create'); setSelectedNoteId(null);}} size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    New
                                </Button>
                            )}
                            {allowImport && viewMode === 'list' && (
                                <Button onClick={() => {setViewMode('import'); setSelectedNoteId(null);}} variant="outline" size="sm">
                                    <FileText className="h-4 w-4 mr-1" />
                                    Import
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar - List View */}
                    {viewMode === 'list' && (
                        <>
                            {/* Mobile toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className="lg:hidden absolute top-3 left-3 z-10"
                            >
                                <Menu className="h-4 w-4" />
                            </Button>

                            {/* Sidebar */}
                            <div className={`${sidebarCollapsed ? 'hidden' : 'flex'} lg:flex flex-col w-full lg:w-80 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50`}>
                                {/* Search */}
                                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
                                        <Input
                                            placeholder="Search..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-7 h-8 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* List */}
                                <ScrollArea className="flex-1">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                        </div>
                                    ) : sortedNotes.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {searchQuery ? 'No items found' : `No ${categoryName.toLowerCase()} yet`}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-2 space-y-1">
                                            {sortedNotes.map((note) => (
                                                <div
                                                    key={note.id}
                                                    onClick={() => setSelectedNoteId(note.id)}
                                                    className={`p-2 rounded cursor-pointer transition-colors ${
                                                        selectedNoteId === note.id
                                                            ? 'bg-slate-200 dark:bg-slate-800'
                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                                                                {note.label}
                                                            </p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                                {new Date(note.updated_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                                                        {note.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>

                            {/* Detail View */}
                            <div className={`${sidebarCollapsed ? 'flex' : 'hidden lg:flex'} flex-1 flex-col overflow-hidden`}>
                                {selectedNote ? (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        {/* Note Header */}
                                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-semibold truncate text-slate-900 dark:text-slate-100">
                                                        {selectedNote.label}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                        {new Date(selectedNote.updated_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {onSelectNote && (
                                                        <Button size="sm" onClick={() => handleSelect(selectedNote)}>
                                                            {selectButtonLabel}
                                                        </Button>
                                                    )}
                                                    {allowEdit && (
                                                        <Button size="sm" variant="ghost" onClick={() => handleStartEdit(selectedNote)} title="Edit">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {allowDelete && (
                                                        <Button size="sm" variant="ghost" onClick={() => handleDelete(selectedNote.id)} className="text-red-600" title="Delete">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            {selectedNote.tags && selectedNote.tags.length > 0 && (
                                                <div className="flex gap-1 mt-2 flex-wrap">
                                                    {selectedNote.tags.map((tag) => (
                                                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Note Content */}
                                        <ScrollArea className="flex-1 p-4 bg-white dark:bg-slate-900">
                                            <pre className="text-sm text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap">
                                                {selectedNote.content}
                                            </pre>
                                        </ScrollArea>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-center p-8">
                                        <div>
                                            <FileText className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                                            <p className="text-slate-500 dark:text-slate-400">
                                                Select an item to view details
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Create View */}
                    {viewMode === 'create' && (
                        <div className="flex-1 flex flex-col overflow-hidden p-4 bg-white dark:bg-slate-900">
                            <div className="mb-3">
                                <Input
                                    placeholder="Title (optional - auto-generated from content)"
                                    value={newNoteLabel}
                                    onChange={(e) => setNewNoteLabel(e.target.value)}
                                    className="text-base"
                                />
                            </div>
                            <Textarea
                                placeholder="Content..."
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                className="flex-1 resize-none font-mono text-sm min-h-[300px] md:min-h-[400px]"
                            />
                            <div className="flex justify-end gap-2 mt-3 flex-shrink-0">
                                <Button onClick={handleCreate} disabled={actionLoading}>
                                    {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                    Create
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Edit View */}
                    {viewMode === 'edit' && editingNote && (
                        <div className="flex-1 flex flex-col overflow-hidden p-4 bg-white dark:bg-slate-900">
                            <div className="mb-3">
                                <Input
                                    placeholder="Title (optional)"
                                    value={editNoteLabel}
                                    onChange={(e) => setEditNoteLabel(e.target.value)}
                                    className="text-base"
                                />
                            </div>
                            <Textarea
                                placeholder="Content..."
                                value={editNoteContent}
                                onChange={(e) => setEditNoteContent(e.target.value)}
                                className="flex-1 resize-none font-mono text-sm min-h-[300px] md:min-h-[400px]"
                            />
                            <div className="flex justify-end gap-2 mt-3 flex-shrink-0">
                                <Button onClick={handleSaveEdit} disabled={actionLoading}>
                                    {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                    Save
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Import View */}
                    {viewMode === 'import' && (
                        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search all notes to import..."
                                        value={importSearchQuery}
                                        onChange={(e) => setImportSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                {sortedImportNotes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                                        <p className="text-slate-500 dark:text-slate-400">
                                            {importSearchQuery ? 'No notes found' : 'No other notes available to import'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 space-y-2">
                                        {sortedImportNotes.map((note) => (
                                            <div
                                                key={note.id}
                                                className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                                                            {note.label}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline" className="text-xs">{note.folder_name}</Badge>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                {new Date(note.updated_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" onClick={() => handleImport(note)} disabled={actionLoading}>
                                                        Import
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 font-mono mt-2">
                                                    {note.content}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
