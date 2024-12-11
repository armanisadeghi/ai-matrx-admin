// lib/redux/notes/notesSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Note, NotesState } from '@/types/notes.types';

const initialState: NotesState = {
    notes: [],
    selectedNoteId: null,
};

const notesSlice = createSlice({
    name: 'notes',
    initialState,
    reducers: {
        initialize: (state, action: PayloadAction<NotesState>) => {
            return action.payload;
        },
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
        setSelectedNote: (state, action: PayloadAction<string | null>) => {
            state.selectedNoteId = action.payload;
        },
    },
});

export const {
    initialize,
    addNote,
    updateNote,
    deleteNote,
    setSelectedNote
} = notesSlice.actions;

export default notesSlice.reducer;
