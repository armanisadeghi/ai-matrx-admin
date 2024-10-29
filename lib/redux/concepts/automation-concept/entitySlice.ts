/*
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Draft } from 'immer';
import { AutomationEntity, EntityData, EntityKeys } from "@/types/entityTypes";

export type EntitySliceState<TEntity extends EntityKeys> = {
    data: Array<EntityData<TEntity>>;
    totalCount: number;
    allPkAndDisplayFields: Array<{ pk: string; display?: string }>;
    initialized: boolean;
    loading: boolean;
    error: string | null;
    lastFetched: Record<string, Date>;
    staleTime: number;
    backups: Record<string, Array<EntityData<TEntity>>>;
    selectedItem: EntityData<TEntity> | null;
    entitySchema: AutomationEntity<EntityKeys>;
    page: number;
    pageSize: number;
};

export function createEntitySlice<TEntity extends EntityKeys>(
    entityKey: TEntity,
    schema: AutomationEntity<TEntity>
) {
    const initialState: EntitySliceState<TEntity> = {
        data: [],
        totalCount: 0,
        allPkAndDisplayFields: [],
        initialized: false,
        loading: false,
        error: null,
        lastFetched: {},
        staleTime: 600000,
        backups: {},
        selectedItem: null,
        entitySchema: schema,
        page: 1,
        pageSize: 10,
    };

    const slice = createSlice({
        name: `entity/${entityKey.toUpperCase()}`,
        initialState,
        reducers: {
            // Generic fetch request
            fetchRequest: (state) => {
                state.loading = true;
                state.error = null;
            },
            fetchSuccess: (state, action: PayloadAction<Array<EntityData<TEntity>>>) => {
                state.loading = false;
                state.data = action.payload as Draft<Array<EntityData<TEntity>>>;
                state.totalCount = action.payload.length;
                state.initialized = true;
                state.error = null;
            },
            fetchFailure: (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            },

            // CRUD for Create, Update, Delete
            createRequest: (state) => {
                state.loading = true;
            },
            createSuccess: (state, action: PayloadAction<EntityData<TEntity>>) => {
                state.loading = false;
                state.data.push(action.payload);
                state.totalCount += 1;
                state.error = null;
            },
            createFailure: (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            },

            updateRequest: (state) => {
                state.loading = true;
            },
            updateSuccess: (state, action: PayloadAction<EntityData<TEntity>>) => {
                state.loading = false;
                const index = state.data.findIndex(item => item.id === action.payload.id);
                if (index !== -1) {
                    state.data[index] = action.payload;
                }
                state.error = null;
            },
            updateFailure: (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            },

            deleteRequest: (state) => {
                state.loading = true;
            },
            deleteSuccess: (state, action: PayloadAction<string | number>) => {
                state.loading = false;
                state.data = state.data.filter(item => item.id !== action.payload);
                state.totalCount = state.data.length;
                state.error = null;
            },
            deleteFailure: (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.error = action.payload;
            },

            // Backup and Restore Functionality
            createBackup: (
                state,
                action: PayloadAction<{ key: string; data: Array<EntityData<TEntity>> }>
            ) => {
                state.backups[action.payload.key] = action.payload.data;
            },
            restoreBackup: (state, action: PayloadAction<string>) => {
                const backupData = state.backups[action.payload];
                if (backupData) {
                    state.data = backupData;
                }
            },

            // Selected Item Handling
            setSelectedItem: (
                state: Draft<EntitySliceState<TEntity>>,
                action: PayloadAction<EntityData<TEntity> | null>
            ) => {
                state.selectedItem = action.payload as Draft<EntityData<TEntity>> | null;
            },

            // Paginated Data Handling
            setPaginatedData: (
                state: Draft<EntitySliceState<TEntity>>,
                action: PayloadAction<{
                    data: Array<EntityData<TEntity>>;
                    page: number;
                    pageSize: number;
                    totalCount: number;
                }>
            ) => {
                state.data = action.payload.data as Draft<Array<EntityData<TEntity>>>;
                state.page = action.payload.page;
                state.pageSize = action.payload.pageSize;
                state.totalCount = action.payload.totalCount;
                state.loading = false;
                state.error = null;
            },

            // Metadata Management
            setAllPkAndDisplayFields: (
                state: Draft<EntitySliceState<TEntity>>,
                action: PayloadAction<Array<{ pk: string; display?: string }>>
            ) => {
                state.allPkAndDisplayFields = action.payload;
            },
            setLastFetched: (
                state: Draft<EntitySliceState<TEntity>>,
                action: PayloadAction<{ key: string; time: number }>
            ) => {
                state.lastFetched[action.payload.key] = new Date(action.payload.time);
            },
            setPage: (
                state: Draft<EntitySliceState<TEntity>>,
                action: PayloadAction<number>
            ) => {
                state.page = action.payload;
            },
            setPageSize: (
                state: Draft<EntitySliceState<TEntity>>,
                action: PayloadAction<number>
            ) => {
                state.pageSize = action.payload;
            },

            // Loading and Error Management
            setLoading: (
                state: Draft<EntitySliceState<TEntity>>,
                action: PayloadAction<boolean>
            ) => {
                state.loading = action.payload;
            },
            setError: (
                state: Draft<EntitySliceState<TEntity>>,
                action: PayloadAction<string | null>
            ) => {
                state.error = action.payload;
            },

            // Initialization
            initializeTable: (state) => {
                state.initialized = true;
            },
        }
    });

    return slice;
}
*/
