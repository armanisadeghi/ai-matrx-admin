import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Draft } from "immer";
import { EntityData, EntityKeys } from "@/types/entityTypes";
import { createEntityActions } from "@/lib/redux/entity/entityActionCreator";
import {
    EntityState,
    FilterPayload,
    HistoryEntry,
    MatrxRecordId, QuickReferenceRecord,
    SortPayload,LoadingState,
    SubscriptionConfig
} from "@/lib/redux/entity/types";

export const createEntitySlice = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    initialState: EntityState<TEntity>
) => {
    const entityActions = createEntityActions(entityKey);

    const slice = createSlice({
        name: `ENTITIES/${entityKey.toUpperCase()}`,
        initialState,
        reducers: {
            // Record Management
            setRecords: (
                state,
                action: PayloadAction<Record<MatrxRecordId, Draft<EntityData<TEntity>>>>
            ) => {
                state.records = action.payload;
                state.loading.lastOperation = 'fetch';
                state.cache.lastFetched[entityKey] = new Date();
                state.cache.stale = false;
            },

            upsertRecords: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>[]>
            ) => {
                action.payload.forEach(record => {
                    const id = record[state.entityMetadata.fields.find(f => f.isPrimary)?.name || 'id'] as MatrxRecordId;
                    state.records[id] = record;
                });
                state.flags.isModified = true;
                state.flags.hasUnsavedChanges = true;
            },

            removeRecords: (
                state,
                action: PayloadAction<MatrxRecordId[]>
            ) => {
                action.payload.forEach(id => {
                    delete state.records[id];
                });
                state.flags.isModified = true;
                state.flags.hasUnsavedChanges = true;
            },

            // Selection Management
            setSelection: (
                state,
                action: PayloadAction<{
                    records: MatrxRecordId[];
                    mode: 'single' | 'multiple' | 'none';
                }>
            ) => {
                const { records, mode } = action.payload;
                state.selection.selectionMode = mode;
                state.selection.selectedRecords = new Set(records);
                state.selection.lastSelected = records[records.length - 1];
                state.selection.activeRecord = records.length === 1
                                               ? state.records[records[0]]
                                               : null;
            },

            clearSelection: (state) => {
                state.selection.selectedRecords.clear();
                state.selection.activeRecord = null;
                state.selection.lastSelected = undefined;
            },

            // Pagination Management
            setPage: (
                state,
                action: PayloadAction<number>
            ) => {
                state.pagination.page = action.payload;
                state.flags.needsRefresh = true;
            },

            setPageSize: (
                state,
                action: PayloadAction<number>
            ) => {
                state.pagination.pageSize = action.payload;
                state.pagination.page = 1;
                state.flags.needsRefresh = true;
            },

            // Filter Management
            setFilters: (
                state,
                action: PayloadAction<FilterPayload>
            ) => {
                const { conditions, replace, temporary } = action.payload;
                if (replace) {
                    state.filters.conditions = conditions;
                } else {
                    state.filters.conditions = [...state.filters.conditions, ...conditions];
                }
                if (!temporary) {
                    state.flags.needsRefresh = true;
                }
            },

            setSorting: (
                state,
                action: PayloadAction<SortPayload>
            ) => {
                const { field, direction, append } = action.payload;
                const newSort = { field, direction };
                if (append) {
                    state.filters.sort.push(newSort);
                } else {
                    state.filters.sort = [newSort];
                }
                state.flags.needsRefresh = true;
            },

            // History Management
            pushToHistory: (
                state,
                action: PayloadAction<Draft<HistoryEntry<TEntity>>>
            ) => {
                state.history.past.push(action.payload);
                if (state.history.past.length > state.history.maxHistorySize) {
                    state.history.past.shift();
                }
                state.history.future = [];
                state.history.lastSaved = new Date();
            },

            undo: (state) => {
                const lastEntry = state.history.past.pop();
                if (lastEntry) {
                    state.history.future.push(lastEntry);
                    if (Array.isArray(lastEntry.previousData)) {
                        lastEntry.previousData.forEach(record => {
                            const id = record[state.entityMetadata.fields.find(f => f.isPrimary)?.name || 'id'] as MatrxRecordId;
                            state.records[id] = record;
                        });
                    } else if (lastEntry.previousData) {
                        const id = lastEntry.previousData[state.entityMetadata.fields.find(f => f.isPrimary)?.name || 'id'] as MatrxRecordId;
                        state.records[id] = lastEntry.previousData;
                    }
                    state.flags.isModified = true;
                    state.flags.hasUnsavedChanges = true;
                }
            },

            redo: (state) => {
                const nextEntry = state.history.future.pop();
                if (nextEntry) {
                    state.history.past.push(nextEntry);
                    if (Array.isArray(nextEntry.data)) {
                        nextEntry.data.forEach(record => {
                            const id = record[state.entityMetadata.fields.find(f => f.isPrimary)?.name || 'id'] as MatrxRecordId;
                            state.records[id] = record;
                        });
                    } else {
                        const id = nextEntry.data[state.entityMetadata.fields.find(f => f.isPrimary)?.name || 'id'] as MatrxRecordId;
                        state.records[id] = nextEntry.data;
                    }
                    state.flags.isModified = true;
                    state.flags.hasUnsavedChanges = true;
                }
            },

            // Quick Reference Management
            setQuickReference: (
                state,
                action: PayloadAction<QuickReferenceRecord[]>
            ) => {
                state.quickReference.records = action.payload;
                state.quickReference.lastUpdated = new Date();
                state.quickReference.fetchComplete = true;
            },

            fetchOneSuccess: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>>
            ) => {
                const record = action.payload;
                const id = record[state.entityMetadata.fields.find(f => f.isPrimary)?.name || 'id'] as MatrxRecordId;
                state.records[id] = record;
                state.loading.lastOperation = 'fetch';
                state.cache.stale = false;
            },

            fetchAllSuccess: (
                state,
                action: PayloadAction<Record<MatrxRecordId, Draft<EntityData<TEntity>>>>
            ) => {
                state.records = action.payload;
                state.loading.lastOperation = 'fetch';
                state.cache.lastFetched[entityKey] = new Date();
                state.cache.stale = false;
            },

            executeCustomQuerySuccess: (
                state,
                action: PayloadAction<Record<MatrxRecordId, Draft<EntityData<TEntity>>>>
            ) => {
                state.records = action.payload; // or update a specific part of the state as needed
                state.loading.lastOperation = 'custom';
            },


            // Loading State Management
            setLoading: (
                state,
                action: PayloadAction<boolean>
            ) => {
                state.loading.loading = action.payload;
                if (!action.payload) {
                    state.loading.lastOperation = undefined;
                }
            },

            setError: (
                state,
                action: PayloadAction<LoadingState['error']>
            ) => {
                state.loading.error = action.payload;
                state.loading.loading = false;
            },

            // Subscription Management
            setSubscription: (
                state,
                action: PayloadAction<Partial<SubscriptionConfig>>
            ) => {
                state.subscription = {
                    ...state.subscription,
                    ...action.payload
                };
            },

            // Flag Management
            setFlags: (
                state,
                action: PayloadAction<Partial<EntityState<TEntity>['flags']>>
            ) => {
                state.flags = {
                    ...state.flags,
                    ...action.payload
                };
            },

            resetState: () => initialState,
        },

        extraReducers: (builder) => {
            builder
                .addMatcher(
                    (action): action is PayloadAction<any> => action.type.startsWith(`ENTITIES/${entityKey.toUpperCase()}/fetch`),
                    (state) => {
                        state.loading.loading = true;
                        state.loading.error = null;
                    }
                )
                .addMatcher(
                    (action): action is PayloadAction<any> => action.type === `ENTITIES/${entityKey.toUpperCase()}/executeCustomQuery`,
                    (state) => {
                        state.loading.loading = true;
                        state.loading.error = null;
                    }
                )
                .addMatcher(
                    (action): action is PayloadAction<{ message?: string; code?: number; details?: any }> => action.type.endsWith('/rejected'),
                    (state, action) => {
                        state.loading.loading = false;
                        state.loading.error = {
                            message: action.payload?.message || 'An error occurred',
                            code: action.payload?.code,
                            details: action.payload?.details
                        };
                    }
                )
                .addMatcher(
                    (action): action is PayloadAction<any> => action.type.endsWith('/fulfilled'),
                    (state) => {
                        state.loading.loading = false;
                        state.loading.error = null;
                    }
                );
        },
    });

    const combinedActions = {
        ...slice.actions,
        ...entityActions,
    };

    return {
        reducer: slice.reducer,
        actions: combinedActions,
    };
};
