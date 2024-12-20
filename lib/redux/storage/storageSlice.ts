import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { StorageState } from './types';

const initialState: StorageState = {
    currentBucket: '',
    currentPath: [],
    items: [],
    buckets: [],
    isLoading: false,
    error: null,
};

const storageSlice = createSlice({
    name: 'storage',
    initialState,
    reducers: {
        setStorageState: (state, action: PayloadAction<Partial<StorageState>>) => {
            Object.assign(state, action.payload);
        },
        resetError: (state) => {
            state.error = null;
        }
    },
});

export const { setStorageState, resetError } = storageSlice.actions;
export default storageSlice.reducer;
