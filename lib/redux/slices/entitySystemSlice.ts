'use client';

// entitySystemSlice — Tracks whether the entity system (schema, entity slices, sagas)
// has been loaded. Starts uninitialized. Routes that need entities dispatch initialize().

import { createSlice } from '@reduxjs/toolkit';

interface EntitySystemState {
    initialized: boolean;
    loading: boolean;
    error: string | null;
}

const initialState: EntitySystemState = {
    initialized: false,
    loading: false,
    error: null,
};

const entitySystemSlice = createSlice({
    name: 'entitySystem',
    initialState,
    reducers: {
        setEntitySystemLoading: (state) => {
            state.loading = true;
            state.error = null;
        },
        setEntitySystemInitialized: (state) => {
            state.initialized = true;
            state.loading = false;
            state.error = null;
        },
        setEntitySystemError: (state, action) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    setEntitySystemLoading,
    setEntitySystemInitialized,
    setEntitySystemError,
} = entitySystemSlice.actions;

export default entitySystemSlice.reducer;
