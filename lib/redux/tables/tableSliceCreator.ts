import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AutomationTableStructure } from "@/types/automationTableTypes";

export type AutomationTableData = Record<string, any>;

export type EntitySliceState = {
    data: AutomationTableData[];
    totalCount: number;
    allPkAndDisplayFields: Array<{
        pk: string | number;
        display?: string;
    }>;
    initialized: boolean;
    loading: boolean;
    error: string | null;
    lastFetched: Record<string, number>;
    staleTime: number;
    backups: Record<string, AutomationTableData[]>;
    selectedItem: AutomationTableData | null;
};

export function createTableSlice(
    tableName: string,
    schema: AutomationTableStructure[keyof AutomationTableStructure]
) {
    const initialState: EntitySliceState = {
        data: [],
        totalCount: 0,
        allPkAndDisplayFields: [],
        initialized: false,
        loading: false,
        error: null,
        lastFetched: {},
        staleTime: 600000, // 10 minutes in milliseconds
        backups: {},
        selectedItem: null,
    };

    const slice = createSlice({
        name: tableName.toUpperCase(),
        initialState,
        reducers: {
            initializeTable: (state) => {
                state.initialized = true;
            },
            setTableData: (state, action: PayloadAction<AutomationTableData[]>) => {
                state.data = action.payload;
                state.loading = false;
                state.error = null;
            },
            setSelectedItem: (
                state,
                action: PayloadAction<AutomationTableData | null>
            ) => {
                state.selectedItem = action.payload;
                state.loading = false;
                state.error = null;
            },
            setLoading: (state, action: PayloadAction<boolean>) => {
                state.loading = action.payload;
                if (action.payload) {
                    state.error = null;
                }
            },
            setError: (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            },
            setTotalCount: (state, action: PayloadAction<number>) => {
                state.totalCount = action.payload;
            },
            setLastFetched: (
                state,
                action: PayloadAction<{ key: string; time: number }>
            ) => {
                state.lastFetched[action.payload.key] = action.payload.time;
            },
            removeLastFetchedKey: (state, action: PayloadAction<string>) => {
                delete state.lastFetched[action.payload];
            },
        },
    });
    return {
        reducer: slice.reducer,
        actions: slice.actions,
    };
}
