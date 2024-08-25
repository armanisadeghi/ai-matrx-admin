// File location: @/features/registered-function/Slice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RegisteredFunctionType } from '@/types/registeredFunctionTypes';
import {
    fetchRegisteredFunctions,
    createRegisteredFunctionThunk,
    updateRegisteredFunctionThunk,
    deleteRegisteredFunctionThunk,
    fetchPaginatedRegisteredFunctions,
    createRegisteredFunctionRPC,
    updateRegisteredFunctionRPC,
    deleteRegisteredFunctionRPC,
    fetchFilteredRegisteredFunctions,
    fetchRegisteredFunctionWithChildren,
    fetchAllRegisteredFunctionsWithChildren,
    fetchRegisteredFunctionById
} from './Thunks';

interface RegisteredFunctionState {
    loading: boolean;
    error: string | null;
    data: RegisteredFunctionType[];
    currentPage: number;
    pageSize: number;
    totalCount: number;
}

const initialState: RegisteredFunctionState = {
    loading: false,
    error: null,
    data: [],
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
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
            .addCase(fetchRegisteredFunctions.fulfilled, (state, action: PayloadAction<RegisteredFunctionType[]>) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(fetchRegisteredFunctions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'An error occurred';
            })
            .addCase(createRegisteredFunctionThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createRegisteredFunctionThunk.fulfilled, (state, action: PayloadAction<RegisteredFunctionType>) => {
                state.loading = false;
                state.data.push(action.payload);
            })
            .addCase(createRegisteredFunctionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'An error occurred';
            })
            .addCase(updateRegisteredFunctionThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateRegisteredFunctionThunk.fulfilled, (state, action: PayloadAction<RegisteredFunctionType>) => {
                state.loading = false;
                const index = state.data.findIndex(rf => rf.id === action.payload.id);
                if (index !== -1) {
                    state.data[index] = action.payload;
                }
            })
            .addCase(updateRegisteredFunctionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'An error occurred';
            })
            .addCase(deleteRegisteredFunctionThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteRegisteredFunctionThunk.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.data = state.data.filter(rf => rf.id !== action.payload);
            })
            .addCase(deleteRegisteredFunctionThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'An error occurred';
            })
            .addCase(fetchPaginatedRegisteredFunctions.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload.data;
                state.currentPage = action.payload.page;
                state.pageSize = action.payload.pageSize;
                state.totalCount = action.payload.data.length; // This should be updated with the actual total count from the backend
            })
            .addCase(fetchFilteredRegisteredFunctions.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(fetchRegisteredFunctionWithChildren.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.data.findIndex(rf => rf.id === action.payload.id);
                if (index !== -1) {
                    state.data[index] = action.payload;
                } else {
                    state.data.push(action.payload);
                }
            })
            .addCase(fetchAllRegisteredFunctionsWithChildren.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload;
            })
            .addCase(fetchRegisteredFunctionById.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.data.findIndex(rf => rf.id === action.payload.id);
                if (index !== -1) {
                    state.data[index] = action.payload;
                } else {
                    state.data.push(action.payload);
                }
            });
    },
});

export default registeredFunctionSlice.reducer;
