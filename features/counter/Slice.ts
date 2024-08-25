// File Location: @/features/counter/Slice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchInputValue, updateInputValue } from './Thunks';

interface CounterState {
    value: number;
    inputValue: number | null;
    isInputValueLoaded: boolean;
    isLoading: boolean;
    error: string | null;
    pendingUpdates: { [key: string]: number };
}

const initialState: CounterState = {
    value: 0,
    inputValue: null,
    isInputValueLoaded: false,
    isLoading: false,
    error: null,
    pendingUpdates: {},
};

export const slice = createSlice({
    name: 'counter',
    initialState,
    reducers: {
        increment: (state) => {
            state.value += 1;
        },
        decrement: (state) => {
            state.value -= 1;
        },
        incrementByAmount: (state, action: PayloadAction<number>) => {
            state.value += action.payload;
        },
        clearInputValue: (state) => {
            state.inputValue = null;
            state.isInputValueLoaded = false;
        },
        optimisticUpdateInputValue: (state, action: PayloadAction<number>) => {
            const updateId = Date.now().toString();
            state.pendingUpdates[updateId] = action.payload;
            state.inputValue = action.payload;
        },
        removeOptimisticUpdate: (state, action: PayloadAction<string>) => {
            delete state.pendingUpdates[action.payload];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchInputValue.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchInputValue.fulfilled, (state, action) => {
                state.isLoading = false;
                state.inputValue = action.payload;
                state.isInputValueLoaded = true;
            })
            .addCase(fetchInputValue.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.error.message || 'An error occurred';
            })
            .addCase(updateInputValue.fulfilled, (state, action) => {
                state.inputValue = action.payload;
                state.pendingUpdates = {};
            })
            .addCase(updateInputValue.rejected, (state, action) => {
                state.error = action.error.message || 'An error occurred';
                state.pendingUpdates = {};
                // Revert to the last known good state
                state.inputValue = Object.values(state.pendingUpdates)[0] || state.inputValue;
            });
    },
});

export const {
    increment,
    decrement,
    incrementByAmount,
    clearInputValue,
    optimisticUpdateInputValue,
    removeOptimisticUpdate
} = slice.actions;

export default slice.reducer;
