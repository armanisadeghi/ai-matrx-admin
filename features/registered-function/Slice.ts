// File location: @/features/registered-function/Slice.ts

import { createSlice } from '@reduxjs/toolkit';
import { fetchRegisteredFunctions, createRegisteredFunctionThunk, updateRegisteredFunctionThunk, deleteRegisteredFunctionThunk } from './Thunks';

interface RegisteredFunctionState {
    loading: boolean;
    error: string | null;
}

const initialState: RegisteredFunctionState = {
    loading: false,
    error: null,
};

const registeredFunctionSlice = createSlice({
    name: 'registeredFunction',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchRegisteredFunctions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRegisteredFunctions.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(fetchRegisteredFunctions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'An error occurred';
            })
            .addCase(createRegisteredFunctionThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createRegisteredFunctionThunk.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(createRegisteredFunctionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'An error occurred';
            })
            .addCase(updateRegisteredFunctionThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateRegisteredFunctionThunk.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(updateRegisteredFunctionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'An error occurred';
            })
            .addCase(deleteRegisteredFunctionThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteRegisteredFunctionThunk.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(deleteRegisteredFunctionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'An error occurred';
            });
    },
});

export default registeredFunctionSlice.reducer;
