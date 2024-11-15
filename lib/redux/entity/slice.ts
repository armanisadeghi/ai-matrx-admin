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
    EntityMetrics, SelectionMode,
} from "@/lib/redux/entity/types";
import {
    clearError,
    createRecordKey,
    resetFlag,
    setError,
    setLoading,
    setSuccess,
    addRecordToSelection,
    removeRecordFromSelection,
    updateSelectionMode,
    isMatrxRecordId,
    createMatrxRecordId,
    isEntityData,
    toggleSelectionMode,
    removeSelections,
    setSpecificSelectionMode,
    handleSelectionForDeletedRecord,
    setNewActiveRecord, setStateIsModified
} from "@/lib/redux/entity/utils";
import {UnifiedQueryOptions} from "@/lib/redux/schema/globalCacheSelectors";
import EntityLogger from "./entityLogger";
import {
    CreateRecordPayload, DeleteRecordPayload,
    EntityActions,
    ExecuteCustomQueryPayload,
    FetchAllPayload,
    FetchOnePayload, FetchQuickReferencePayload, FetchRecordsPayload, UpdateRecordPayload
} from "@/lib/redux/entity/actions";
import { QueryOptions } from "./sagaHelpers";

export const createEntitySlice = <TEntity extends EntityKeys>(
        entityKey: TEntity,
        initialState: EntityState<TEntity>
    ) => {
        const entityLogger = EntityLogger.createLoggerWithDefaults(`Entity Slice - ${entityKey}`, entityKey);
        const slice = createSlice({
                    name: `ENTITIES/${entityKey.toUpperCase()}`,
                    initialState,
                    reducers: {
                        fetchOne: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<FetchOnePayload>
                        ) => {
                            entityLogger.log('debug', 'fetchOne', action.payload);
                            setLoading(state, 'FETCH_ONE');
                        },
                        fetchOneSuccess: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<EntityData<TEntity>>
                        ) => {
                            entityLogger.log('debug', 'fetchOneSuccess', action.payload);

                            const record = action.payload;
                            const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
                            state.records[recordKey] = record;
                            setSuccess(state, 'FETCH_ONE');

                            addRecordToSelection(state, recordKey);
                            state.cache.stale = false;
                        },

                        resetFetchOneStatus: (state) => {
                            entityLogger.log('debug', 'resetFetchOneStatus');
                            resetFlag(state, 'FETCH_ONE');
                        },

                        // Fetch Records Management ========================================
                        fetchRecords: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<FetchRecordsPayload>
                        ) => {
                            entityLogger.log('debug', 'fetchRecords', action.payload);
                            setLoading(state, 'FETCH_RECORDS');
                        },
                        fetchRecordsSuccess: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<{
                                data: Draft<EntityData<TEntity>>[];
                                page: number;
                                pageSize: number;
                                totalCount: number;
                            }>
                        ) => {
                            const {data, page, pageSize, totalCount} = action.payload;
                            const {primaryKeyMetadata} = state.entityMetadata;

                            entityLogger.log('debug', 'fetchRecordsSuccess', {data, page, pageSize, totalCount});

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

                            setSuccess(state, 'FETCH_RECORDS');
                            state.cache.stale = false;
                        },
                        fetchRecordsRejected: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<{
                                message: string;
                                code?: number;
                                details?: any;
                            }>
                        ) => {
                            state.loading.loading = false;
                            state.loading.error = action.payload;
                            state.loading.lastOperation = 'FETCH_RECORDS';

                            entityLogger.log('error', 'fetchRecordsRejected', action.payload);
                        },


                        // Fetch All Management ========================================
                        fetchAll: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<FetchAllPayload>
                        ) => {
                            entityLogger.log('debug', 'fetchAll', action.payload);
                            setLoading(state, 'FETCH_ALL');
                        },
                        fetchAllSuccess: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<Draft<EntityData<TEntity>>[]>
                        ) => {
                            const {primaryKeyMetadata} = state.entityMetadata;
                            entityLogger.log('debug', 'fetchAllSuccess', action.payload);

                            state.records = {};
                            action.payload.forEach(record => {
                                const recordKey = createRecordKey(primaryKeyMetadata, record);
                                state.records[recordKey] = record;
                            });

                            setSuccess(state, 'FETCH_ALL');
                            state.cache.stale = false;
                        },


                        // Custom Query Management ========================================
                        executeCustomQuery: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<ExecuteCustomQueryPayload>
                        ) => {
                            entityLogger.log('debug', 'executeCustomQuery', action.payload);
                            setLoading(state, 'CUSTOM');
                        },
                        executeCustomQuerySuccess: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<Draft<EntityData<TEntity>>[]>
                        ) => {
                            entityLogger.log('debug', 'executeCustomQuerySuccess', action.payload);

                            state.records = {};
                            action.payload.forEach(record => {
                                const recordKey: MatrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
                                state.records[recordKey] = record;
                            });

                            setSuccess(state, 'CUSTOM');
                        },


                        fetchQuickReference: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<FetchQuickReferencePayload>
                        ) => {
                            entityLogger.log('debug', 'fetchQuickReference', action.payload);
                            setLoading(state, 'FETCH_QUICK_REFERENCE');
                        },
                        fetchQuickReferenceSuccess: (
                            state,
                            action: PayloadAction<QuickReferenceRecord[]>
                        ) => {
                            entityLogger.log('debug', 'fetchQuickReferenceSuccess', action.payload);

                            state.quickReference.records = action.payload;
                            state.quickReference.lastUpdated = new Date().toISOString();
                            state.quickReference.fetchComplete = true;

                            setSuccess(state, 'FETCH_QUICK_REFERENCE');
                        },
                        setQuickReference: (
                            state,
                            action: PayloadAction<QuickReferenceRecord[]>
                        ) => {
                            entityLogger.log('debug', 'setQuickReference', action.payload);

                            state.quickReference.records = action.payload;
                            state.quickReference.lastUpdated = new Date().toISOString();
                            state.quickReference.fetchComplete = true;
                        },
                        addQuickReferenceRecords: (
                            state,
                            action: PayloadAction<QuickReferenceRecord[]>
                        ) => {
                            entityLogger.log('debug', 'addQuickReferenceRecord', action.payload);
                            action.payload.forEach(newRecord => {
                                const existingIndex = state.quickReference.records.findIndex(
                                    record => record.recordKey === newRecord.recordKey
                                );
                                if (existingIndex !== -1) {
                                    state.quickReference.records[existingIndex] = newRecord;
                                    entityLogger.log('info', 'Replaced existing quick reference record', newRecord);
                                } else {
                                    state.quickReference.records.push(newRecord);
                                    entityLogger.log('info', 'Added new quick reference record', newRecord);
                                }
                            });
                            state.quickReference.lastUpdated = new Date().toISOString();
                        },


                        getOrFetchSelectedRecords: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<MatrxRecordId[]>
                        ) => {
                            entityLogger.log('debug', 'getOrFetchSelectedRecords', action.payload);
                            setLoading(state, 'FETCH_RECORDS');
                        },

                        fetchSelectedRecords: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<QueryOptions<TEntity> & { callbackId?: string }>
                        ) => {
                            entityLogger.log('debug', 'fetchSelectedRecords', action.payload);
                            setLoading(state, 'FETCH_RECORDS');
                        },

                        fetchSelectedRecordsSuccess: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<EntityData<TEntity>[]>
                        ) => {
                            const {primaryKeyMetadata} = state.entityMetadata;
                            entityLogger.log('debug', 'fetchSelectedRecordsSuccess', action.payload);

                            action.payload.forEach(record => {
                                const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, record);
                                state.records[recordKey] = record;
                            });

                            setSuccess(state, 'FETCH_RECORDS');
                        },

                        createRecord: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<CreateRecordPayload<TEntity>>
                        ) => {
                            entityLogger.log('debug', 'createRecord', action.payload);
                            setLoading(state, 'CREATE');
                        },

                        createRecordSuccess: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<EntityData<TEntity>>
                        ) => {
                            const recordKey: MatrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
                            entityLogger.log('debug', 'createRecordSuccess', action.payload);

                            state.records[recordKey] = action.payload;
                            setNewActiveRecord(state, recordKey);
                            setSuccess(state, 'CREATE');
                            setStateIsModified(state);
                        },

                        updateRecord: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<UpdateRecordPayload<TEntity>>
                        ) => {
                            entityLogger.log('debug', 'updateRecord', action.payload);
                            setLoading(state, 'UPDATE');
                        },

                        updateRecordSuccess: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<EntityData<TEntity>>
                        ) => {
                            const recordKey: MatrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
                            entityLogger.log('debug', 'updateRecordSuccess', action.payload);

                            state.records[recordKey] = action.payload;
                            setNewActiveRecord(state, recordKey);
                            setSuccess(state, 'UPDATE');
                            setStateIsModified(state);
                        },

                        optimisticUpdate: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<{
                                record: EntityData<TEntity>;
                                rollback?: EntityData<TEntity>;
                            }>
                        ) => {
                            const {record, rollback} = action.payload;
                            const recordKey: MatrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
                            entityLogger.log('debug', 'optimisticUpdate', {record, rollback});

                            if (rollback) {
                                state.history.past.push({
                                    timestamp: new Date().toISOString(),
                                    operation: 'update',
                                    data: record,
                                    previousData: rollback,
                                    metadata: {reason: 'optimistic_update'}
                                });
                            }

                            state.records[recordKey] = record;
                            state.flags.isModified = true;
                            state.flags.hasUnsavedChanges = true;
                        },


                        deleteRecord: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<DeleteRecordPayload>
                        ) => {
                            entityLogger.log('debug', 'deleteRecord', action.payload);
                            setLoading(state, 'DELETE');
                        },
                        deleteRecordSuccess: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<{ matrxRecordId: MatrxRecordId }>
                        ) => {
                            const recordKey: MatrxRecordId = action.payload.matrxRecordId;
                            entityLogger.log('debug', 'deleteRecordSuccess', {recordKey});
                            delete state.records[recordKey];
                            handleSelectionForDeletedRecord(state, recordKey);
                            setSuccess(state, 'DELETE');
                            state.flags.isModified = true;
                        },

                        setSelectionMode: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<SelectionMode>
                        ) => {
                            entityLogger.log('debug', 'setSelectionMode', action.payload);
                            setSpecificSelectionMode(state, action.payload);
                        },

                        setToggleSelectionMode: (state) => {
                            entityLogger.log('debug', 'setToggleSelectionMode', state.selection.selectionMode);
                            toggleSelectionMode(state);
                        },

                        clearSelection: (state) => {
                            entityLogger.log('debug', 'clearSelection');
                            removeSelections(state);
                        },

                        addToSelection: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<MatrxRecordId>
                        ) => {
                            entityLogger.log('info', 'addToSelection start', action.payload);

                            if (isMatrxRecordId(action.payload)) {
                                addRecordToSelection(state, action.payload);
                            } else if (isEntityData(action.payload, state.entityMetadata.fields)) {
                                const matrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
                                addRecordToSelection(state, matrxRecordId);
                            } else {
                                entityLogger.log('error', 'Invalid Record in addToSelection', action.payload);
                            }
                        },

                        removeFromSelection: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<MatrxRecordId>
                        ) => {
                            entityLogger.log('debug', 'removeFromSelection', action.payload);
                            removeRecordFromSelection(state, action.payload);
                        },

                        setActiveRecord: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<MatrxRecordId>
                        ) => {
                            entityLogger.log('debug', 'setActiveRecord', action.payload);
                            state.selection.activeRecord = action.payload;
                            if (!state.selection.selectedRecords.includes(action.payload)) {
                                addRecordToSelection(state, action.payload);
                            }
                        },

                        clearActiveRecord: (state) => {
                            entityLogger.log('debug', 'clearActiveRecord');
                            state.selection.activeRecord = null;
                        },

                        setValidated: (state) => {
                            entityLogger.log('debug', 'setValidated');
                            state.flags.isValidated = true;
                        },

                        resetValidated: (state) => {
                            entityLogger.log('debug', 'resetValidated');
                            state.flags.isValidated = false;
                        },

                        invalidateRecord: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<string>
                        ) => {
                            const recordKey = action.payload;
                            entityLogger.log('debug', 'invalidateRecord', {recordKey});

                            if (state.records[recordKey]) {
                                state.cache.invalidationTriggers.push(recordKey);
                                state.cache.stale = true;
                            }
                        },

                        // Core Record Management
                        setRecords: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<Record<string, Draft<EntityData<TEntity>>>>
                        ) => {
                            entityLogger.log('debug', 'setRecords', action.payload);
                            state.records = action.payload;
                            state.loading.lastOperation = 'FETCH';
                            const cacheKey = state.entityMetadata.primaryKeyMetadata.database_fields.join('::');
                            state.cache.lastFetched[cacheKey] = new Date().toISOString();
                            state.cache.stale = false;
                        },

                        upsertRecords: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<{ recordKey: MatrxRecordId; record: EntityData<TEntity> }[]>
                        ) => {
                            action.payload.forEach(({ recordKey, record }) => {
                                state.records[recordKey] = {
                                    ...(state.records[recordKey] || {}),
                                    ...record,
                                };
                            });

                            state.flags.isModified = true;
                            state.flags.hasUnsavedChanges = true;
                        },

                        removeRecords: (
                            state: EntityState<TEntity>,
                            action: PayloadAction<MatrxRecordId[]>
                        ) => {
                            entityLogger.log('debug', 'removeRecords', action.payload);

                            action.payload.forEach(recordKey => {
                                delete state.records[recordKey];
                            });

                            state.quickReference.records = state.quickReference.records.filter(
                                quickRefRecord => !action.payload.includes(quickRefRecord.recordKey)
                            );

                            state.flags.isModified = true;
                            state.flags.hasUnsavedChanges = true;
                        },

                        // History Management
                        pushToHistory: (
                            state,
                            action: PayloadAction<Draft<HistoryEntry<TEntity>>>
                        ) => {
                            entityLogger.log('debug', 'pushToHistory', action.payload);
                            state.history.past.push(action.payload);
                            if (state.history.past.length > state.history.maxHistorySize) {
                                state.history.past.shift();
                            }
                            state.history.future = [];
                            state.history.lastSaved = new Date().toISOString();
                        },

                        undo: (state) => {
                            entityLogger.log('debug', 'undo');
                            const lastEntry = state.history.past.pop();
                            if (lastEntry) {
                                state.history.future.push(lastEntry);
                                const {primaryKeyMetadata} = state.entityMetadata;

                                if (Array.isArray(lastEntry.previousData)) {
                                    lastEntry.previousData.forEach(record => {
                                        const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, record);
                                        state.records[recordKey] = record;
                                    });
                                } else if (lastEntry.previousData) {
                                    const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, lastEntry.previousData);
                                    state.records[recordKey] = lastEntry.previousData;
                                }
                                state.flags.isModified = true;
                                state.flags.hasUnsavedChanges = true;
                            }
                        },

                        redo: (state) => {
                            entityLogger.log('debug', 'redo');
                            const nextEntry = state.history.future.pop();
                            if (nextEntry) {
                                state.history.past.push(nextEntry);
                                const {primaryKeyMetadata} = state.entityMetadata;

                                if (Array.isArray(nextEntry.data)) {
                                    nextEntry.data.forEach(record => {
                                        const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, record);
                                        state.records[recordKey] = record;
                                    });
                                } else {
                                    const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, nextEntry.data);
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
                            entityLogger.log('debug', 'setPage', action.payload);
                            state.pagination.page = action.payload;
                            state.flags.needsRefresh = true;
                        },

                        setPageSize: (
                            state,
                            action: PayloadAction<number>
                        ) => {
                            entityLogger.log('debug', 'setPageSize', action.payload);
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
                            entityLogger.log('debug', 'setFilters', action.payload);

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
                            entityLogger.log('debug', 'setSorting', action.payload);

                            if (append) {
                                state.filters.sort.push(newSort);
                            } else {
                                state.filters.sort = [newSort];
                            }
                            state.flags.needsRefresh = true;
                        },

                        clearFilters: (state) => {
                            entityLogger.log('debug', 'clearFilters');
                            state.filters.conditions = [];
                            state.filters.sort = [];
                            state.flags.needsRefresh = true;
                        },

                        // Metadata Management
                        initializeEntityMetadata: (
                            state,
                            action: PayloadAction<EntityMetadata>
                        ) => {
                            entityLogger.log('debug', 'initializeEntityMetadata', action.payload);
                            state.entityMetadata = action.payload;
                        },

                        updateEntityMetadata: (
                            state,
                            action: PayloadAction<Partial<EntityMetadata>>
                        ) => {
                            entityLogger.log('debug', 'updateEntityMetadata', action.payload);
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
                            entityLogger.log('debug', 'setLoading', action.payload);
                            state.loading.loading = action.payload;
                            if (!action.payload) {
                                state.loading.lastOperation = undefined;
                            }
                        },

                        setError: (
                            state,
                            action: PayloadAction<LoadingState['error']>
                        ) => {
                            entityLogger.log('error', 'setError', action.payload);
                            state.loading.error = action.payload;
                            state.loading.loading = false;
                        },

                        // Subscription Management
                        setSubscription: (
                            state,
                            action: PayloadAction<Partial<SubscriptionConfig>>
                        ) => {
                            entityLogger.log('debug', 'setSubscription', action.payload);
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
                            entityLogger.log('debug', 'setFlags', action.payload);
                            state.flags = {
                                ...state.flags,
                                ...action.payload
                            };
                        },

                        // Add the action to fetch metrics
                        fetchMetrics: (state, action: PayloadAction<{ timeRange?: string }>) => {
                            entityLogger.log('debug', 'fetchMetrics', action.payload);
                            state.loading.loading = true;
                            state.loading.error = null;
                        },

                        // Add the success handler
                        fetchMetricsSuccess: (
                            state,
                            action: PayloadAction<EntityMetrics>
                        ) => {
                            entityLogger.log('debug', 'fetchMetricsSuccess', action.payload);
                            state.metrics = action.payload;
                            state.loading.loading = false;
                        },

                        // Add the set metrics action
                        setMetrics: (
                            state,
                            action: PayloadAction<Partial<EntityMetrics>>
                        ) => {
                            entityLogger.log('debug', 'setMetrics', action.payload);
                            state.metrics = {
                                ...state.metrics,
                                ...action.payload,
                                lastUpdated: new Date().toISOString()
                            };
                        },

                        // State Management
                        refreshData: (state) => {
                            entityLogger.log('debug', 'refreshData');
                            state.flags.needsRefresh = true;
                        },

                        invalidateCache: (state) => {
                            entityLogger.log('debug', 'invalidateCache');
                            state.cache.stale = true;
                        },

                        resetState: () => initialState,
                    },

                    // Extra Reducers
                    extraReducers: (builder) => {
                        builder
                            .addMatcher(
                                (action) => action.type.endsWith('/rejected'),
                                (state, action: PayloadAction<{ message?: string; code?: number; details?: any }>) => {
                                    entityLogger.log('error', 'Rejected action', action.payload);
                                    setError(state, action);
                                }
                            )
                            .addMatcher(
                                (action) => action.type.endsWith('/fulfilled'),
                                (state) => {
                                    entityLogger.log('debug', 'Fulfilled action');
                                    clearError(state);
                                }
                            );
                    },
                }
            )
        ;

        return {
            reducer: slice.reducer,
            actions: slice.actions,
        };
    }
;
