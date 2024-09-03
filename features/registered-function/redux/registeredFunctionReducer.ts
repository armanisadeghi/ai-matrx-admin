/*
// File Location: features/registered-function/registeredFunctionReducer.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RegisteredFunctionBase } from '@/types/registeredFunctionTypes';
import {DeleteResponse, PaginatedResponse, SliceState} from "@/types/reduxTypes";


const initialState: SliceState<RegisteredFunctionBase> = {
    items: {},
    allIdAndNames: [],
    totalCount: 0,
    loading: false,
    error: null,
    lastFetched: {},
    staleTime: 10 * 60 * 1000,
    backups: {},
};

const registeredFunctionSlice = createSlice({
    name: featureName,
    initialState,
    reducers: {
        // Additional local reducers if needed
    },
    extraReducers: (builder) => {
        builder
            .addCase(registeredFunctionActions.fetchOnePending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registeredFunctionActions.fetchOneFulfilled, (state, action: PayloadAction<RegisteredFunctionBase>) => {
                state.loading = false;
                state.items[action.payload.id] = action.payload;
                state.lastFetched[action.payload.id] = Date.now();
            })
            .addCase(registeredFunctionActions.fetchOneRejected, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(registeredFunctionActions.fetchPaginatedPending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registeredFunctionActions.fetchPaginatedFulfilled, (state, action: PayloadAction<PaginatedResponse<RegisteredFunctionBase>>) => {
                state.loading = false;
                state.totalCount = action.payload.totalCount;
                state.allIdAndNames = action.payload.allIdAndNames;
                action.payload.paginatedData.forEach((item) => {
                    state.items[item.id] = item;
                    state.lastFetched[item.id] = Date.now();
                });
            })
            .addCase(registeredFunctionActions.fetchPaginatedRejected, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(registeredFunctionActions.deleteOnePending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registeredFunctionActions.deleteOneFulfilled, (state, action: PayloadAction<DeleteResponse>) => {
                state.loading = false;
                action.payload.deletedIds.forEach((id) => {
                    delete state.items[id];
                    state.allIdAndNames = state.allIdAndNames.filter((item) => item.id !== id);
                    state.totalCount -= 1;
                });
            })
            .addCase(registeredFunctionActions.deleteOneRejected, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(registeredFunctionActions.updatePending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registeredFunctionActions.updateFulfilled, (state, action: PayloadAction<RegisteredFunctionBase>) => {
                state.loading = false;
                state.items[action.payload.id] = action.payload;
            })
            .addCase(registeredFunctionActions.updateRejected, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(registeredFunctionActions.createPending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registeredFunctionActions.createFulfilled, (state, action: PayloadAction<RegisteredFunctionBase>) => {
                state.loading = false;
                state.items[action.payload.id] = action.payload;
                state.totalCount += 1;
                state.allIdAndNames.push({ id: action.payload.id, name: action.payload.name });
            })
            .addCase(registeredFunctionActions.createRejected, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const registeredFunctionReducer = registeredFunctionSlice.reducer;
*/
