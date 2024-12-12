// lib/redux/notes/notesSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Note, Folder, NotesState } from '@/types/notes.types';

const initialState: NotesState = {
    notes: [],
    folders: [],
    selectedNoteId: null,
    selectedFolderId: null,
};

const notesSlice = createSlice({
    name: 'notes',
    initialState,
    reducers: {
        initialize: (state, action: PayloadAction<NotesState>) => {
            return action.payload;
        },
        // Folder operations
        addFolder: (state, action: PayloadAction<Folder>) => {
            state.folders.push(action.payload);
        },
        updateFolder: (state, action: PayloadAction<Folder>) => {
            const index = state.folders.findIndex(folder => folder.id === action.payload.id);
            if (index !== -1) {
                state.folders[index] = action.payload;
            }
        },
        deleteFolder: (state, action: PayloadAction<string>) => {
            // Move notes from deleted folder to root
            state.notes = state.notes.map(note =>
                note.folderId === action.payload
                ? { ...note, folderId: null }
                : note
            );
            state.folders = state.folders.filter(folder => folder.id !== action.payload);
            if (state.selectedFolderId === action.payload) {
                state.selectedFolderId = null;
            }
        },
        // Note operations
        addNote: (state, action: PayloadAction<Note>) => {
            state.notes.push(action.payload);
        },
        updateNote: (state, action: PayloadAction<Note>) => {
            const index = state.notes.findIndex(note => note.id === action.payload.id);
            if (index !== -1) {
                state.notes[index] = action.payload;
            }
        },
        deleteNote: (state, action: PayloadAction<string>) => {
            state.notes = state.notes.filter(note => note.id !== action.payload);
            if (state.selectedNoteId === action.payload) {
                state.selectedNoteId = null;
            }
        },
        moveNote: (state, action: PayloadAction<{ noteId: string; folderId: string | null }>) => {
            const note = state.notes.find(n => n.id === action.payload.noteId);
            if (note) {
                note.folderId = action.payload.folderId;
            }
        },
        // Selection operations
        setSelectedNote: (state, action: PayloadAction<string | null>) => {
            state.selectedNoteId = action.payload;
        },
        setSelectedFolder: (state, action: PayloadAction<string | null>) => {
            state.selectedFolderId = action.payload;
        },
    },
});

export const {
    initialize,
    addFolder,
    updateFolder,
    deleteFolder,
    addNote,
    updateNote,
    deleteNote,
    moveNote,
    setSelectedNote,
    setSelectedFolder,
} = notesSlice.actions;

export default notesSlice.reducer;
