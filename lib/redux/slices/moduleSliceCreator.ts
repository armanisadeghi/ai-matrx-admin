// lib/redux/slices/moduleSliceCreator.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ModuleBaseState<T> {
    initiated: boolean;
    data: Record<string, any>;
    items: Record<string, any>;
    userPreferences: Record<string, any>;
    loading: boolean;
    error: string | null;
    staleTime: number;
}


export const createModuleSlice = <T>(
    moduleName: string,
    initiated: boolean = false,
    initialData: Record<string, any> = {},
    initialItems: Record<string, any> = {},
    staleTime: number = 600000,
) => {
    const initialState: ModuleBaseState<T> = {
        initiated: initiated,
        data: initialData,
        items: initialItems,
        userPreferences: {},
        loading: false,
        error: null,
        staleTime,
    };

    const slice = createSlice({
        name: moduleName,
        initialState,
        reducers: {
            setInitiated: (state, action: PayloadAction<boolean>) => {
                state.initiated = action.payload;
            },
            setLoading: (state, action: PayloadAction<boolean>) => {
                state.loading = action.payload;
            },
            setError: (state, action: PayloadAction<string | null>) => {
                state.error = action.payload;
            },
            setUserPreferences: (state, action: PayloadAction<Record<string, any>>) => {
                state.userPreferences = action.payload;
            },
            setData: (state, action: PayloadAction<T>) => {
                state.data = action.payload;
            },
            setItems: (state, action: PayloadAction<T>) => {
                state.items = action.payload;
            },
            resetState: (state) => {
                state.loading = false;
                state.error = null;
                state.data = initialData;
                state.items = initialItems;
                state.userPreferences = {};
            },
            markDataStale: (state) => {
                state.staleTime = Date.now();
            },
        },
    });

    return {
        reducer: slice.reducer,
        actions: slice.actions,
    };
};
