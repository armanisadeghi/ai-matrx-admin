// File Location: lib/redux/schemaSagas/schemaSlice.ts

import { createSlice, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { initialSchemas } from "@/utils/schema/initialSchemas";
import { schemaActionCreators } from "@/lib/redux/schemaSagas/schemaActionCreator";

// State interface for dynamic schema management
export interface DynamicSchemaState {
    [tableName: string]: {
        data: any[];
        loading: boolean;
        error: string | null;
        staleTime: number;
        backups?: Record<string, any>;
        lastFetched?: number;
    };
}

// Initial state for the dynamic schema slice
const initialState: DynamicSchemaState = {};

// Function to create a dynamic slice for each schema
export const schemaSliceCreator = (tableName: string) => {
    const schema = initialSchemas[tableName];
    if (!schema) {
        throw new Error(`Schema not found for table: ${tableName}`);
    }

    // Action creators specific to this table
    const actions = schemaActionCreators(tableName);

    // Initial state for the slice specific to the table
    const tableInitialState = {
        data: [],
        loading: false,
        error: null,
        staleTime: 600000,
        backups: {},
        lastFetched: 0,
    };

    const slice = createSlice({
        name: tableName,
        initialState: tableInitialState,
        reducers: {
            fetchRequest(state) {
                state.loading = true;
                state.error = null;
            },
            fetchSuccess(state, action: PayloadAction<{ tableName: string; data: any[] }>) {
                state.loading = false;
                state.data = action.payload.data;
                state.error = null;
                state.lastFetched = Date.now();
            },
            fetchFailure(state, action: PayloadAction<{ tableName: string; error: string }>) {
                state.loading = false;
                state.error = action.payload.error;
            },
            createRequest(state) {
                state.loading = true;
                state.error = null;
            },
            createSuccess(state, action: PayloadAction<{ tableName: string; data: any }>) {
                state.loading = false;
                state.data.push(action.payload.data);
                state.error = null;
            },
            createFailure(state, action: PayloadAction<{ tableName: string; error: string }>) {
                state.loading = false;
                state.error = action.payload.error;
            },
            updateRequest(state) {
                state.loading = true;
                state.error = null;
            },
            updateSuccess(state, action: PayloadAction<{ tableName: string; data: any }>) {
                const index = state.data.findIndex((item) => item.id === action.payload.data.id);
                if (index !== -1) {
                    state.data[index] = action.payload.data;
                }
                state.loading = false;
                state.error = null;
            },
            updateFailure(state, action: PayloadAction<{ tableName: string; error: string }>) {
                state.loading = false;
                state.error = action.payload.error;
            },
            deleteRequest(state) {
                state.loading = true;
                state.error = null;
            },
            deleteSuccess(state, action: PayloadAction<{ tableName: string; id: string }>) {
                state.data = state.data.filter((item) => item.id !== action.payload.id);
                state.loading = false;
                state.error = null;
            },
            deleteFailure(state, action: PayloadAction<{ tableName: string; error: string }>) {
                state.loading = false;
                state.error = action.payload.error;
            },
            markDataStale(state) {
                state.lastFetched = 0;
            },
            revertOptimisticUpdate(state, action: PayloadAction<{ tableName: string; id: string }>) {
                const { tableName, id } = action.payload;
                if (state.backups && state.backups[id]) {
                    const backupData = state.backups[id];
                    state.data = state.data.map((item) => (item.id === id ? backupData : item));
                    delete state.backups[id];
                }
            },
            ...createCustomReducers(schema, tableName),
        },
        extraReducers: (builder: ActionReducerMapBuilder<typeof tableInitialState>) => {
            // Responding to Saga-triggered actions
            builder
                .addCase(actions.fetchSuccess, (state, action: PayloadAction<{ tableName: string; data: any[] }>) => {
                    state.data = action.payload.data;
                    state.loading = false;
                    state.error = null;
                })
                .addCase(actions.fetchFailure, (state, action: PayloadAction<{ tableName: string; error: string }>) => {
                    state.loading = false;
                    state.error = action.payload.error;
                })
                .addCase(actions.executeQuerySuccess, (state, action: PayloadAction<{ tableName: string; data: any[] }>) => {
                    state.data = action.payload.data;
                    state.loading = false;
                    state.error = null;
                })
                .addCase(actions.executeQueryFailure, (state, action: PayloadAction<{ tableName: string; error: string }>) => {
                    state.loading = false;
                    state.error = action.payload.error;
                });
        },
    });

    return slice;
};

// Custom reducers based on schema fields
function createCustomReducers(schema: any, tableName: string) {
    const reducers: Record<string, any> = {};

    if (schema.fields.status) {
        reducers.changeStatusRequest = (state) => {
            state.loading = true;
            state.error = null;
        };
        reducers.changeStatusSuccess = (state, action: PayloadAction<{ tableName: string; data: any }>) => {
            const index = state.data.findIndex((item) => item.id === action.payload.data.id);
            if (index !== -1) {
                state.data[index] = action.payload.data;
            }
            state.loading = false;
            state.error = null;
        };
        reducers.changeStatusFailure = (state, action: PayloadAction<{ tableName: string; error: string }>) => {
            state.loading = false;
            state.error = action.payload.error;
        };
    }

    return reducers;
}

export default schemaSliceCreator;
