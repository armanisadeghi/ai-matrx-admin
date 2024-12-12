// hooks/useNotesManager.ts
import { useState, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
    updateNote,
    deleteNote,
    setSelectedNote,
    addNote,
    addFolder,
    updateFolder,
    deleteFolder,
    setSelectedFolder,
    moveNote,
} from '@/lib/redux/notes/notesSlice';
import { manualSave } from '@/types';
import { addTag } from '@/lib/redux/notes/tagsSlice';
import debounce from 'lodash/debounce';
import type { Note, Tag, Folder } from '@/types';

export type UseNotesManagerReturn = ReturnType<typeof useNotesManager>;

export const useNotesManager = () => {
    const dispatch = useAppDispatch();
    const notes = useAppSelector(state => state.notes.notes);
    const selectedNoteId = useAppSelector(state => state.notes.selectedNoteId);
    // New folder-related selectors (will be undefined for older state structure)
    const folders = useAppSelector(state => state.notes.folders ?? []);
    const selectedFolderId = useAppSelector(state => state.notes.selectedFolderId ?? null);

    const tags = useAppSelector(state => state.tags.tags);
    const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'title'>('date');

    const currentNote = useAppSelector(state =>
        state.notes.notes.find(n => n.id === selectedNoteId)
    );

    // Folder-related handlers (won't affect existing functionality)
    const folderHandlers = {
        handleAddFolder: (folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => {
            const newFolder: Folder = {
                ...folderData,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            dispatch(addFolder(newFolder));
            return newFolder;
        },

        handleUpdateFolder: (folder: Folder) => {
            dispatch(updateFolder({
                ...folder,
                updatedAt: new Date().toISOString()
            }));
        },

        handleDeleteFolder: (folderId: string) => {
            dispatch(deleteFolder(folderId));
        },

        handleFolderSelect: (folderId: string | null) => {
            dispatch(setSelectedFolder(folderId));
        },

        handleMoveNote: (noteId: string, folderId: string | null) => {
            dispatch(moveNote({ noteId, folderId }));
        }
    };

    const handleFilterByTags = (tagIds: string[]) => {
        setSelectedFilterTags(tagIds);
    };

    const debouncedSave = useCallback(
        debounce((updatedNote: Note) => {
            dispatch(updateNote({
                ...updatedNote,
                updatedAt: new Date().toISOString()
            }));
        }, 1000),
        [dispatch]
    );

    const noteHandlers = {
        handleNoteChange: (changes: Partial<Note>) => {
            if (!currentNote) return;
            const updatedNote = {
                ...currentNote,
                ...changes
            };
            debouncedSave(updatedNote);
        },

        handleNoteDelete: (noteId: string) => {
            dispatch(deleteNote(noteId));
            setIsEditing(false);
        },

        handleNoteSelect: (noteId: string) => {
            dispatch(setSelectedNote(noteId));
            setIsEditing(false);
        },

        handleAddNote: (folderId: string | null = null) => {
            const newNote: Note = {
                id: crypto.randomUUID(),
                title: 'New Note',
                content: '',
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                folderId: folderId, // New field, but optional
            };
            dispatch(addNote(newNote));
            dispatch(setSelectedNote(newNote.id));
            setIsEditing(true);
        },

        handleCopyNote: (note: Note) => {
            navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
        },

        toggleEditMode: () => {
            setIsEditing(prev => !prev);
        }
    };

    const tagHandlers = {
        handleAddTag: (tag: Tag) => {
            dispatch(addTag(tag));
        },

        handleTagSelect: (tagIds: string[]) => {
            if (!currentNote) return;
            noteHandlers.handleNoteChange({ tags: tagIds });
        }
    };

    // Enhanced filtering to include folder support
    const filteredAndSortedNotes = useMemo(() => {
        let filtered = notes.filter(note => {
            const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.content.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesTags = selectedFilterTags.length === 0 ||
                selectedFilterTags.every(tagId => note.tags.includes(tagId));

            // Optional folder filtering
            const matchesFolder = !selectedFolderId || note.folderId === selectedFolderId;

            return matchesSearch && matchesTags && matchesFolder;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            return a.title.localeCompare(b.title);
        });
    }, [notes, searchTerm, selectedFilterTags, sortBy, selectedFolderId]);

    // Utility handlers
    const utilityHandlers = {
        handleManualSave: () => {
            dispatch(manualSave('notes'));
        },

        handleSearchChange: (term: string) => {
            setSearchTerm(term);
        },

        handleSortChange: (sort: 'date' | 'title') => {
            setSortBy(sort);
        }
    };

    // Get notes for a specific folder
    const getNotesByFolder = useCallback((folderId: string | null) => {
        return notes.filter(note => note.folderId === folderId);
    }, [notes]);

    return {
        // States
        currentNote,
        notes: filteredAndSortedNotes,
        folders, // New
        selectedFolderId, // New
        tags,
        searchTerm,
        sortBy,
        selectedNoteId,
        isEditing,
        selectedFilterTags,

        // State setters
        setIsEditing,
        setSelectedFilterTags,

        // Handlers
        ...noteHandlers,
        ...tagHandlers,
        ...utilityHandlers,
        ...folderHandlers, // New

        // Filter by tags
        handleFilterByTags,

        // Folder-specific utilities
        getNotesByFolder, // New
    };
};
