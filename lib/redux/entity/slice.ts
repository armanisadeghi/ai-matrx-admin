import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {Draft} from "immer";
import {EntityData, EntityKeys} from "@/types/entityTypes";
import {
    EntityState,
    FilterPayload,
    HistoryEntry,
    MatrxRecordId,
    QuickReferenceRecord,
    SortPayload,
    LoadingState,
    SubscriptionConfig,
    EntityMetadata,
    EntityMetrics,
} from "@/lib/redux/entity/types";
import {createRecordKey} from "@/lib/redux/entity/utils";
import {UnifiedQueryOptions} from "@/lib/redux/schema/globalCacheSelectors";
import {QueryOptions} from "@/lib/redux/entity/sagas";

export const createEntitySlice = <TEntity extends EntityKeys>(
    entityKey: TEntity,
    initialState: EntityState<TEntity>
) => {
    const slice = createSlice({
        name: `ENTITIES/${entityKey.toUpperCase()}`,
        initialState,
        reducers: {
            fetchRecords: (state, action: PayloadAction<{
                page: number;
                pageSize: number;
                options?: QueryOptions<TEntity>;
                maxCount?: number;
            }>) => {
                state.loading.loading = true;
                state.loading.error = null;
            },
            fetchAll: (state) => {
                state.loading.loading = true;
                state.loading.error = null;
            },
            executeCustomQuery: (state, action: PayloadAction<UnifiedQueryOptions<TEntity>>) => {
                state.loading.loading = true;
                state.loading.error = null;
            },

            // Success Handlers
            fetchRecordsSuccess: (
                state,
                action: PayloadAction<{
                    data: Draft<EntityData<TEntity>>[];
                    page: number;
                    pageSize: number;
                    totalCount: number;
                }>
            ) => {
                const {data, page, pageSize, totalCount} = action.payload;
                const {primaryKeyMetadata} = state.entityMetadata;

                data.forEach(record => {
                    const recordKey = createRecordKey(primaryKeyMetadata, record);
                    state.records[recordKey] = record;
                });

                state.pagination.page = page;
                state.pagination.pageSize = pageSize;
                state.pagination.totalCount = totalCount;
                state.pagination.totalPages = Math.ceil(totalCount / pageSize);
                state.pagination.hasNextPage = page * pageSize < totalCount;
                state.pagination.hasPreviousPage = page > 1;

                state.loading.loading = false;
                state.cache.stale = false;
                state.loading.lastOperation = 'fetch';
            },

            fetchAllSuccess: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>[]>
            ) => {
                const {primaryKeyMetadata} = state.entityMetadata;
                state.records = {};
                action.payload.forEach(record => {
                    const recordKey = createRecordKey(primaryKeyMetadata, record);
                    state.records[recordKey] = record;
                });
                state.loading.lastOperation = 'fetch';
                state.cache.stale = false;
                state.loading.loading = false;
            },


            // Fetch One Management ========================================

            fetchOne: (state, action: PayloadAction<{ primaryKeyValues: Record<string, MatrxRecordId> }>) => {
                state.loading.loading = true;
                state.loading.error = null;
                state.flags.fetchOneSuccess = false;
            },


            fetchOneSuccess: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>>
            ) => {
                const record = action.payload;
                const { primaryKeyMetadata } = state.entityMetadata;
                const recordKey = createRecordKey(primaryKeyMetadata, record);
                state.records[recordKey] = record;
                state.loading.lastOperation = 'fetch';
                state.flags.fetchOneSuccess = true;
                state.cache.stale = false;
                state.loading.loading = false;

                if (!state.selection.selectedRecords.includes(recordKey)) {
                    state.selection.selectedRecords.push(recordKey);
                    state.selection.lastSelected = recordKey;
                    if (state.selection.selectedRecords.length === 1) {
                        state.selection.activeRecord = record;
                    } else {
                        state.selection.activeRecord = null;
                    }
                }

                state.flags.fetchOneSuccess = false;
            },


            // Quick Reference Management ========================================
            fetchQuickReference: (state, action?: PayloadAction<{ maxRecords?: number }>) => {
                state.loading.loading = true;
                state.loading.error = null;
            },
            fetchQuickReferenceSuccess: (
                state,
                action: PayloadAction<QuickReferenceRecord[]>
            ) => {
                state.quickReference.records = action.payload;
                state.quickReference.lastUpdated = new Date().toISOString();
                state.quickReference.fetchComplete = true;
                state.loading.loading = false;
            },
            setQuickReference: (
                state,
                action: PayloadAction<QuickReferenceRecord[]>
            ) => {
                state.quickReference.records = action.payload;
                state.quickReference.lastUpdated = new Date().toISOString();
                state.quickReference.fetchComplete = true;
            },

            // State-wide Validation Management ========================================
            setValidated: (state) => {
                state.flags.isValidated = true;
            },

            // Action to reset `isValidated` to false
            resetValidated: (state) => {
                state.flags.isValidated = false;
            },

            // Update Record Management ========================================
            updateRecord: (state, action: PayloadAction<{
                primaryKeyValues: Record<string, MatrxRecordId>;
                data: Partial<EntityData<TEntity>>;
            }>) => {
                state.loading.loading = true;
                state.loading.error = null;
            },
            updateRecordSuccess: (state, action: PayloadAction<Draft<EntityData<TEntity>>>) => {
                const { primaryKeyMetadata } = state.entityMetadata;
                const recordKey = createRecordKey(primaryKeyMetadata, action.payload);
                state.records[recordKey] = action.payload;
                state.loading.loading = false;
                state.flags.isModified = true;
                state.flags.isValidated = false; // Reset validation flag
            },

            optimisticUpdate: (
                state,
                action: PayloadAction<{
                    record: Draft<EntityData<TEntity>>;
                    rollback?: Draft<EntityData<TEntity>>;
                }>
            ) => {
                const { record, rollback } = action.payload;
                const { primaryKeyMetadata } = state.entityMetadata;
                const recordKey = createRecordKey(primaryKeyMetadata, record);

                if (rollback) {
                    state.history.past.push({
                        timestamp: new Date().toISOString(),
                        operation: 'update',
                        data: record,
                        previousData: rollback,
                        metadata: { reason: 'optimistic_update' }
                    });
                }

                state.records[recordKey] = record;
                state.flags.isModified = true;
                state.flags.hasUnsavedChanges = true;
            },

            // Delete Record Management ========================================
            deleteRecord: (state, action: PayloadAction<{
                primaryKeyValues: Record<string, MatrxRecordId>
            }>) => {
                state.loading.loading = true;
                state.loading.error = null;
            },
            deleteRecordSuccess: (
                state,
                action: PayloadAction<{ primaryKeyValues: Record<string, MatrxRecordId> }>
            ) => {
                const {primaryKeyMetadata} = state.entityMetadata;
                const recordKey = createRecordKey(primaryKeyMetadata, action.payload.primaryKeyValues);
                delete state.records[recordKey];
                state.loading.loading = false;
                state.flags.isModified = true;
            },




            // Create Record Management ========================================
            createRecord: (state, action: PayloadAction<EntityData<TEntity>>) => {
                state.loading.loading = true;
                state.loading.error = null;
            },

            createRecordSuccess: (state, action: PayloadAction<Draft<EntityData<TEntity>>>) => {
                const { primaryKeyMetadata } = state.entityMetadata;
                const recordKey = createRecordKey(primaryKeyMetadata, action.payload);
                state.records[recordKey] = action.payload;
                state.loading.loading = false;
                state.flags.isModified = true;
                state.flags.isValidated = false;
            },




            fetchRecordsRejected: (
                state,
                action: PayloadAction<{
                    message: string;
                    code?: number;
                    details?: any;
                }>
            ) => {
                state.loading.loading = false;
                state.loading.error = action.payload;
                state.loading.lastOperation = 'fetch';
            },

            invalidateRecord: (
                state,
                action: PayloadAction<string>
            ) => {
                const recordKey = action.payload;
                if (state.records[recordKey]) {
                    state.cache.invalidationTriggers.push(recordKey);
                    state.cache.stale = true;
                }
            },
            executeCustomQuerySuccess: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>[]>
            ) => {
                const {primaryKeyMetadata} = state.entityMetadata;
                state.records = {};
                action.payload.forEach(record => {
                    const recordKey = createRecordKey(primaryKeyMetadata, record);
                    state.records[recordKey] = record;
                });
                state.loading.lastOperation = 'custom';
                state.loading.loading = false;
            },

            // Core Record Management
            setRecords: (
                state,
                action: PayloadAction<Record<string, Draft<EntityData<TEntity>>>>
            ) => {
                state.records = action.payload;
                state.loading.lastOperation = 'fetch';
                const cacheKey = state.entityMetadata.primaryKeyMetadata.database_fields.join('::');
                state.cache.lastFetched[cacheKey] = new Date().toISOString();
                state.cache.stale = false;
            },

            upsertRecords: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>[]>
            ) => {
                const {primaryKeyMetadata} = state.entityMetadata;
                action.payload.forEach(record => {
                    const recordKey = createRecordKey(primaryKeyMetadata, record);
                    state.records[recordKey] = record;
                });
                state.flags.isModified = true;
                state.flags.hasUnsavedChanges = true;
            },

            removeRecords: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>[]>
            ) => {
                const {primaryKeyMetadata} = state.entityMetadata;
                action.payload.forEach(record => {
                    const recordKey = createRecordKey(primaryKeyMetadata, record);
                    delete state.records[recordKey];
                });
                state.flags.isModified = true;
                state.flags.hasUnsavedChanges = true;
            },

            // Selection Management
            setSelection: (
                state,
                action: PayloadAction<{
                    records: Draft<EntityData<TEntity>>[];
                    mode: 'single' | 'multiple' | 'none';
                }>
            ) => {
                const { records, mode } = action.payload;
                const { primaryKeyMetadata } = state.entityMetadata;

                state.selection.selectionMode = mode;
                state.selection.selectedRecords = records.map(record =>
                    createRecordKey(primaryKeyMetadata, record)
                );

                if (records.length === 1) {
                    state.selection.activeRecord = records[0];
                    state.selection.lastSelected = createRecordKey(primaryKeyMetadata, records[0]);
                } else {
                    state.selection.activeRecord = null;
                    state.selection.lastSelected = records.length > 0
                                                   ? createRecordKey(primaryKeyMetadata, records[records.length - 1])
                                                   : undefined;
                }
            },

            clearSelection: (state) => {
                state.selection.selectedRecords = [];
                state.selection.activeRecord = null;
                state.selection.lastSelected = undefined;
            },

            addToSelection: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>>
            ) => {
                const { primaryKeyMetadata } = state.entityMetadata;
                const recordKey = createRecordKey(primaryKeyMetadata, action.payload);

                if (!state.selection.selectedRecords.includes(recordKey)) {
                    state.selection.selectedRecords.push(recordKey);
                    state.selection.lastSelected = recordKey;

                    if (state.selection.selectedRecords.length === 1) {
                        state.selection.activeRecord = action.payload;
                    } else {
                        state.selection.activeRecord = null;
                    }
                }
            },

            removeFromSelection: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>>
            ) => {
                const { primaryKeyMetadata } = state.entityMetadata;
                const recordKey = createRecordKey(primaryKeyMetadata, action.payload);

                state.selection.selectedRecords = state.selection.selectedRecords.filter(
                    key => key !== recordKey
                );

                if (state.selection.lastSelected === recordKey) {
                    state.selection.lastSelected = state.selection.selectedRecords[
                    state.selection.selectedRecords.length - 1
                        ];
                }

                if (state.selection.selectedRecords.length === 1) {
                    state.selection.activeRecord = state.records[state.selection.selectedRecords[0]];
                } else {
                    state.selection.activeRecord = null;
                }
            },

            toggleSelection: (
                state,
                action: PayloadAction<Draft<EntityData<TEntity>>>
            ) => {
                const { primaryKeyMetadata } = state.entityMetadata;
                const recordKey = createRecordKey(primaryKeyMetadata, action.payload);

                const index = state.selection.selectedRecords.indexOf(recordKey);
                if (index === -1) {
                    // Add to selection
                    state.selection.selectedRecords.push(recordKey);
                    state.selection.lastSelected = recordKey;

                    if (state.selection.selectedRecords.length === 1) {
                        state.selection.activeRecord = action.payload;
                    } else {
                        state.selection.activeRecord = null;
                    }
                } else {
                    // Remove from selection
                    state.selection.selectedRecords.splice(index, 1);

                    if (state.selection.lastSelected === recordKey) {
                        state.selection.lastSelected = state.selection.selectedRecords[
                        state.selection.selectedRecords.length - 1
                            ];
                    }

                    if (state.selection.selectedRecords.length === 1) {
                        state.selection.activeRecord = state.records[state.selection.selectedRecords[0]];
                    } else {
                        state.selection.activeRecord = null;
                    }
                }
            },

            batchSelection: (
                state,
                action: PayloadAction<{
                    operation: 'add' | 'remove' | 'toggle';
                    records: Draft<EntityData<TEntity>>[];
                }>
            ) => {
                const { operation, records } = action.payload;
                const { primaryKeyMetadata } = state.entityMetadata;

                const recordKeys = records.map(record =>
                    createRecordKey(primaryKeyMetadata, record)
                );

                switch (operation) {
                    case 'add':
                        state.selection.selectedRecords = [
                            ...new Set([...state.selection.selectedRecords, ...recordKeys])
                        ];
                        break;
                    case 'remove':
                        state.selection.selectedRecords = state.selection.selectedRecords
                            .filter(key => !recordKeys.includes(key));
                        break;
                    case 'toggle':
                        recordKeys.forEach(key => {
                            const index = state.selection.selectedRecords.indexOf(key);
                            if (index === -1) {
                                state.selection.selectedRecords.push(key);
                            } else {
                                state.selection.selectedRecords.splice(index, 1);
                            }
                        });
                        break;
                }

                state.selection.lastSelected = state.selection.selectedRecords[
                state.selection.selectedRecords.length - 1
                    ];

                if (state.selection.selectedRecords.length === 1) {
                    state.selection.activeRecord = state.records[state.selection.selectedRecords[0]];
                } else {
                    state.selection.activeRecord = null;
                }
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
                state.history.lastSaved = new Date().toISOString();
            },

            undo: (state) => {
                const lastEntry = state.history.past.pop();
                if (lastEntry) {
                    state.history.future.push(lastEntry);
                    const {primaryKeyMetadata} = state.entityMetadata;

                    if (Array.isArray(lastEntry.previousData)) {
                        lastEntry.previousData.forEach(record => {
                            const recordKey = createRecordKey(primaryKeyMetadata, record);
                            state.records[recordKey] = record;
                        });
                    } else if (lastEntry.previousData) {
                        const recordKey = createRecordKey(primaryKeyMetadata, lastEntry.previousData);
                        state.records[recordKey] = lastEntry.previousData;
                    }
                    state.flags.isModified = true;
                    state.flags.hasUnsavedChanges = true;
                }
            },

            redo: (state) => {
                const nextEntry = state.history.future.pop();
                if (nextEntry) {
                    state.history.past.push(nextEntry);
                    const {primaryKeyMetadata} = state.entityMetadata;

                    if (Array.isArray(nextEntry.data)) {
                        nextEntry.data.forEach(record => {
                            const recordKey = createRecordKey(primaryKeyMetadata, record);
                            state.records[recordKey] = record;
                        });
                    } else {
                        const recordKey = createRecordKey(primaryKeyMetadata, nextEntry.data);
                        state.records[recordKey] = nextEntry.data;
                    }
                    state.flags.isModified = true;
                    state.flags.hasUnsavedChanges = true;
                }
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
                const {conditions, replace, temporary} = action.payload;
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
                const {field, direction, append} = action.payload;
                const newSort = {field, direction};
                if (append) {
                    state.filters.sort.push(newSort);
                } else {
                    state.filters.sort = [newSort];
                }
                state.flags.needsRefresh = true;
            },

            clearFilters: (state) => {
                state.filters.conditions = [];
                state.filters.sort = [];
                state.flags.needsRefresh = true;
            },

            // Metadata Management
            initializeEntityMetadata: (
                state,
                action: PayloadAction<EntityMetadata>
            ) => {
                state.entityMetadata = action.payload;
            },

            updateEntityMetadata: (
                state,
                action: PayloadAction<Partial<EntityMetadata>>
            ) => {
                state.entityMetadata = {
                    ...state.entityMetadata,
                    ...action.payload,
                };
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

            // Add the action to fetch metrics
            fetchMetrics: (state, action: PayloadAction<{ timeRange?: string }>) => {
                state.loading.loading = true;
                state.loading.error = null;
            },

            // Add the success handler
            fetchMetricsSuccess: (
                state,
                action: PayloadAction<EntityMetrics>
            ) => {
                state.metrics = action.payload;
                state.loading.loading = false;
            },

            // Add the set metrics action
            setMetrics: (
                state,
                action: PayloadAction<Partial<EntityMetrics>>
            ) => {
                state.metrics = {
                    ...state.metrics,
                    ...action.payload,
                    lastUpdated: new Date().toISOString()
                };
            },

            // State Management
            refreshData: (state) => {
                state.flags.needsRefresh = true;
            },

            invalidateCache: (state) => {
                state.cache.stale = true;
            },

            resetState: () => initialState,
        },

        extraReducers: (builder) => {
            builder
                .addMatcher(
                    (action) => action.type.endsWith('/rejected'),
                    (state, action: PayloadAction<{
                        message?: string;
                        code?: number;
                        details?: any;
                    }>) => {
                        state.loading.loading = false;
                        state.loading.error = {
                            message: action.payload?.message || 'An error occurred',
                            code: action.payload?.code,
                            details: action.payload?.details,
                        };
                    }
                )
                .addMatcher(
                    (action) => action.type.endsWith('/fulfilled'),
                    (state) => {
                        state.loading.loading = false;
                        state.loading.error = null;
                    }
                );
        },
    });

    return {
        reducer: slice.reducer,
        actions: slice.actions,
    };
};
