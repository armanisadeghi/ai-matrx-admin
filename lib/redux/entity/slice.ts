import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Draft } from 'immer';
import { EntityData, EntityKeys } from '@/types/entityTypes';
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
    SelectionMode,
    EntityOperationMode,
    QueryOptions,
} from '@/lib/redux/entity/types/stateTypes';
import {
    clearError,
    createRecordKey,
    resetFlag,
    setError,
    setLoading,
    setSuccess,
    addRecordToSelection,
    removeRecordFromSelection,
    isMatrxRecordId,
    isEntityData,
    toggleSelectionMode,
    removeSelections,
    setSpecificSelectionMode,
    handleSelectionForDeletedRecord,
    setNewActiveRecord,
    removeFromUnsavedRecords,
    checkAndUpdateUnsavedChanges,
} from '@/lib/redux/entity/utils/stateHelpUtils';
import EntityLogger from './utils/entityLogger';
import {
    CreateRecordPayload,
    createRecordSuccessPayload,
    DeleteRecordPayload,
    DirectCreateRecordPayload,
    DirectUpdateRecordPayload,
    ExecuteCustomQueryPayload,
    FetchAllPayload,
    FetchOnePayload,
    FetchOneWithFkIfkPayload,
    FetchQuickReferencePayload,
    FetchRecordsPayload,
    GetOrFetchSelectedRecordsPayload,
    UpdateRecordPayload,
} from '@/lib/redux/entity/actions';
import { Callback } from '@/utils/callbackManager';
import { EntityModeManager } from './utils/crudOpsManagement';
import { getOrFetchSelectedRecordsThunk } from './thunks';

export const createEntitySlice = <TEntity extends EntityKeys>(entityKey: TEntity, initialState: EntityState<TEntity>) => {
    const entityLogger = EntityLogger.createLoggerWithDefaults(`Entity Slice`, entityKey, 'ENTITY_SLICE');
    const modeManager = new EntityModeManager(entityKey);

    const slice = createSlice({
        name: `ENTITIES/${entityKey.toUpperCase()}`,
        initialState,
        reducers: {
            fetchOne: (state: EntityState<TEntity>, action: PayloadAction<FetchOnePayload>) => {
                entityLogger.log('debug', 'fetchOne', action.payload);
                setLoading(state, 'FETCH_ONE');
            },
            fetchOneSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
                entityLogger.log('debug', 'fetchOneSuccess', action.payload);

                const record = action.payload;
                const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
                state.records[recordKey] = record;
                setSuccess(state, 'FETCH_ONE');

                addRecordToSelection(state, entityKey, recordKey);
                state.cache.stale = false;
            },

            resetFetchOneStatus: (state) => {
                entityLogger.log('debug', 'resetFetchOneStatus');
                resetFlag(state, 'FETCH_ONE');
            },

            // Fetch Records Management ========================================
            fetchRecords: (state: EntityState<TEntity>, action: PayloadAction<FetchRecordsPayload>) => {
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
                const { data, page, pageSize, totalCount } = action.payload;
                const { primaryKeyMetadata } = state.entityMetadata;

                entityLogger.log('debug', 'fetchRecordsSuccess', { data, page, pageSize, totalCount });

                data.forEach((record) => {
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

            fetchOneWithFkIfk: (state: EntityState<TEntity>, action: PayloadAction<FetchOneWithFkIfkPayload>) => {
                entityLogger.log('debug', '------ > fetchOneWithFkIfk set to loading', action.payload);
                setLoading(state, 'FETCH_ONE_WITH_FK_IFK');
            },

            fetchOneWithFkIfkSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
                const record = action.payload;
                const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
                state.records[recordKey] = record;
                setSuccess(state, 'FETCH_ONE_WITH_FK_IFK');
                entityLogger.log('debug', 'fetchOneWithFkIfkSuccess set to success', action.payload);
                state.cache.stale = false;
            },

            resetFetchOneWithFkIfkStatus: (state) => {
                resetFlag(state, 'FETCH_ONE_WITH_FK_IFK');
                entityLogger.log('debug', 'resetFetchOneWithFkIfkStatus flag reset.');
            },

            fetchedAsRelatedSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>[]>) => {
                const { primaryKeyMetadata } = state.entityMetadata;
                entityLogger.log('debug', 'fetchedAsRelatedSuccess triggerd', action.payload);

                removeSelections(state);
                entityLogger.log('debug', 'Removed all selections');

                action.payload.forEach((record) => {
                    const recordKey = createRecordKey(primaryKeyMetadata, record);
                    entityLogger.log('debug', 'Adding record to selection', recordKey);
                    state.records[recordKey] = record;
                    addRecordToSelection(state, entityKey, recordKey);
                });
                setSuccess(state, 'FETCHED_AS_RELATED');
                entityLogger.log('debug', 'fetchedAsRelatedSuccess set to success');
                state.cache.stale = false;
            },

            // Fetch All Management ========================================
            fetchAll: (state: EntityState<TEntity>, action: PayloadAction<FetchAllPayload>) => {
                entityLogger.log('debug', 'fetchAll', action.payload);
                setLoading(state, 'FETCH_ALL');
            },
            fetchAllSuccess: (state: EntityState<TEntity>, action: PayloadAction<Draft<EntityData<TEntity>>[]>) => {
                const { primaryKeyMetadata } = state.entityMetadata;
                entityLogger.log('debug', 'fetchAllSuccess', action.payload);

                state.records = {};
                action.payload.forEach((record) => {
                    const recordKey = createRecordKey(primaryKeyMetadata, record);
                    state.records[recordKey] = record;
                });

                setSuccess(state, 'FETCH_ALL');
                state.cache.stale = false;
            },

            // Custom Query Management ========================================
            executeCustomQuery: (state: EntityState<TEntity>, action: PayloadAction<ExecuteCustomQueryPayload>) => {
                entityLogger.log('debug', 'executeCustomQuery', action.payload);
                setLoading(state, 'CUSTOM');
            },
            executeCustomQuerySuccess: (state: EntityState<TEntity>, action: PayloadAction<Draft<EntityData<TEntity>>[]>) => {
                entityLogger.log('debug', 'executeCustomQuerySuccess', action.payload);

                state.records = {};
                action.payload.forEach((record) => {
                    const recordKey: MatrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
                    state.records[recordKey] = record;
                });

                setSuccess(state, 'CUSTOM');
            },

            fetchQuickReference: (state: EntityState<TEntity>, action: PayloadAction<FetchQuickReferencePayload>) => {
                entityLogger.log('debug', 'fetchQuickReference', action.payload);
                setLoading(state, 'FETCH_QUICK_REFERENCE');
            },
            fetchQuickReferenceSuccess: (state, action: PayloadAction<QuickReferenceRecord[]>) => {
                entityLogger.log('debug', 'fetchQuickReferenceSuccess', action.payload);

                state.quickReference.records = action.payload;
                state.quickReference.lastUpdated = new Date().toISOString();
                state.quickReference.fetchComplete = true;

                setSuccess(state, 'FETCH_QUICK_REFERENCE');
            },
            setQuickReference: (state, action: PayloadAction<QuickReferenceRecord[]>) => {
                entityLogger.log('debug', 'setQuickReference', action.payload);

                state.quickReference.records = action.payload;
                state.quickReference.lastUpdated = new Date().toISOString();
                state.quickReference.fetchComplete = true;
            },
            addQuickReferenceRecords: (state, action: PayloadAction<QuickReferenceRecord[]>) => {
                entityLogger.log('debug', 'addQuickReferenceRecord', action.payload);
                action.payload.forEach((newRecord) => {
                    const existingIndex = state.quickReference.records.findIndex((record) => record.recordKey === newRecord.recordKey);
                    if (existingIndex !== -1) {
                        state.quickReference.records[existingIndex] = newRecord;
                        entityLogger.log('debug', 'Replaced existing quick reference record', newRecord);
                    } else {
                        state.quickReference.records.push(newRecord);
                        entityLogger.log('debug', 'Added new quick reference record', newRecord);
                    }
                });
                state.quickReference.lastUpdated = new Date().toISOString();
            },

            getOrFetchSelectedRecords: (state: EntityState<TEntity>, action: PayloadAction<GetOrFetchSelectedRecordsPayload>) => {
                entityLogger.log('debug', 'getOrFetchSelectedRecords', action.payload);
                setLoading(state, 'GET_OR_FETCH_RECORDS');
            },

            getOrFetchSelectedRecordsSuccess: (state: EntityState<TEntity>, action: PayloadAction) => {
                entityLogger.log('debug', 'getOrFetchSelectedRecordsSuccess', action.payload);
                setSuccess(state, 'GET_OR_FETCH_RECORDS');
            },

            fetchSelectedRecords: (state: EntityState<TEntity>, action: PayloadAction<QueryOptions<TEntity> & { callbackId?: Callback }>) => {
                entityLogger.log('debug', 'fetchSelectedRecords', action.payload);
                setLoading(state, 'FETCH_RECORDS');
            },

            fetchSelectedRecordsSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>[]>) => {
                const { primaryKeyMetadata } = state.entityMetadata;
                entityLogger.log('debug', 'fetchSelectedRecordsSuccess', action.payload);

                action.payload.forEach((record) => {
                    const recordKey: MatrxRecordId = createRecordKey(primaryKeyMetadata, record);
                    state.records[recordKey] = record;
                    setNewActiveRecord(state, recordKey);
                });
                setSuccess(state, 'FETCH_RECORDS');
            },

            setSelectionMode: (state: EntityState<TEntity>, action: PayloadAction<SelectionMode>) => {
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

            setSwitchSelectedRecord: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
                entityLogger.log('debug', 'setSwitchSlectedRecord', action.payload);

                if (state.selection.selectedRecords.includes(action.payload)) {
                    if (state.selection.activeRecord !== action.payload) {
                        state.selection.activeRecord = action.payload;
                    }
                    return;
                } else {
                    removeSelections(state);
                    state.selection.selectedRecords.push(action.payload);
                    state.selection.selectionMode = 'single';
                    state.selection.activeRecord = action.payload;
                }
            },

            addToSelection: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
                if (isMatrxRecordId(action.payload)) {
                    addRecordToSelection(state, entityKey, action.payload);
                } else if (isEntityData(action.payload, state.entityMetadata.entityFields)) {
                    const matrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
                    addRecordToSelection(state, entityKey, matrxRecordId);
                } else {
                    entityLogger.log('error', 'Invalid Record in addToSelection', action.payload);
                }
            },

            removeFromSelection: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
                removeRecordFromSelection(state, action.payload);
            },

            setActiveRecord: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
                state.selection.lastActiveRecord = state.selection.activeRecord;
                state.selection.activeRecord = action.payload;

                if (!state.selection.selectedRecords.includes(action.payload)) {
                    addRecordToSelection(state, entityKey, action.payload);
                }
            },

            setActiveRecordSmart: (state: EntityState<TEntity>, action: PayloadAction<string>) => {
                let recordKey: MatrxRecordId;

                // Check if the payload is already a record key (contains a colon)
                if (action.payload.includes(':')) {
                    recordKey = action.payload;
                } else {
                    // If it's a simple ID, create a record key using the state's metadata
                    recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, { id: action.payload });
                }

                console.log('Entity Slice Smart Set Active Record: ', {
                    originalPayload: action.payload,
                    generatedKey: recordKey,
                });

                state.selection.lastActiveRecord = state.selection.activeRecord;
                state.selection.activeRecord = recordKey;

                if (!state.selection.selectedRecords.includes(recordKey)) {
                    console.log('Adding Active Record to Selection: ', recordKey);
                    addRecordToSelection(state, entityKey, recordKey);
                }
            },

            clearActiveRecord: (state) => {
                entityLogger.log('debug', 'clearActiveRecord');
                state.selection.activeRecord = null;
            },

            setOperationMode: (state: EntityState<TEntity>, action: PayloadAction<EntityOperationMode>) => {
                entityLogger.log('debug', 'setOperationMode', action.payload);
                const result = modeManager.changeMode(state, action.payload);
                if (!result.canProceed) {
                    state.loading.error = {
                        message: result.error || 'Cannot change modes',
                        code: 400,
                    };
                    return;
                }
            },

            startRecordCreation: (state: EntityState<TEntity>, action: PayloadAction<{ count?: number; tempId?: string }>) => {
                entityLogger.log('debug', 'startRecordCreation', action.payload);
                const result = modeManager.changeMode(state, 'create', action.payload.tempId);
                if (!result.canProceed) {
                    state.loading.error = {
                        message: result.error || 'Cannot start creation',
                        code: 400,
                    };
                    return;
                }
                // Since we are only STARTING the process, there is nothing to load so we use 'reverseLoading' = true
                setLoading(state, 'CREATE', true);
            },

            startRecordCreationWithData: (
                state: EntityState<TEntity>,
                action: PayloadAction<{
                    tempId: string; // Making this required since we need it for the record
                    initialData: Partial<EntityData<TEntity>>; // Making this required since this is the purpose of this action
                }>
            ) => {
                entityLogger.log('debug', 'startRecordCreationWithData', action.payload);
                const { tempId, initialData } = action.payload;

                const result = modeManager.changeMode(state, 'create', tempId);
                if (!result.canProceed) {
                    state.loading.error = {
                        message: result.error || 'Cannot start creation',
                        code: 400,
                    };
                    return;
                }

                setLoading(state, 'CREATE', true);

                state.unsavedRecords[tempId] = initialData;
                state.flags.hasUnsavedChanges = true;
                state.flags.operationMode = 'create';
            },
            startCreateWithInitialData: (
                state: EntityState<TEntity>,
                action: PayloadAction<{
                    tempId: string;
                    initialData: Partial<EntityData<TEntity>>;
                }>
            ) => {
                entityLogger.log('debug', 'startCreateWithInitialData Action Payload: ', action.payload);
                const { tempId, initialData } = action.payload;
                setLoading(state, 'CREATE', true);
            
                // Create a new object reference with all previous records preserved
                state.unsavedRecords = {
                    ...state.unsavedRecords,
                    [tempId]: initialData
                };
                
                state.flags.hasUnsavedChanges = true;
                state.flags.operationMode = 'create';
                entityLogger.log('debug', 'startCreateWithInitialData Unsaved Record: ', state.unsavedRecords[tempId]);
                entityLogger.log('debug', 'All Unsaved Records: ', state.unsavedRecords);
            },

            startBatchRecordCreation: (
                state: EntityState<TEntity>,
                action: PayloadAction<
                    Array<{
                        tempId: string;
                        initialData: Partial<EntityData<TEntity>>;
                    }>
                >
            ) => {
                entityLogger.log('debug', 'startBatchRecordCreation', action.payload);

                if (!action.payload.length) {
                    return;
                }

                const result = modeManager.changeMode(state, 'create');
                if (!result.canProceed) {
                    state.loading.error = {
                        message: result.error || 'Cannot start batch creation',
                        code: 400,
                    };
                    return;
                }

                setLoading(state, 'CREATE', true);

                action.payload.forEach(({ tempId, initialData }) => {
                    state.unsavedRecords[tempId] = initialData;
                });

                state.flags.hasUnsavedChanges = true;
                state.flags.operationMode = 'create';
            },

            createRecord: (state: EntityState<TEntity>, action: PayloadAction<CreateRecordPayload>) => {
                entityLogger.log('debug', 'createRecord', action.payload);
                const tempRecordId = action.payload.tempRecordId;
                const recordData = state.unsavedRecords[tempRecordId];

                if (!recordData) {
                    entityLogger.log('error', 'No unsaved data found for temp record', tempRecordId);
                    return;
                }
                setLoading(state, 'CREATE');
            },
            createRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<createRecordSuccessPayload>) => {
                entityLogger.log('debug', 'createRecordSuccess', action.payload);

                const tempId = action.payload.tempRecordId;
                const data = action.payload.data;

                state.pendingOperations = state.pendingOperations.filter((matrxRecordId) => matrxRecordId !== tempId);
                removeFromUnsavedRecords(state, tempId);

                const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, data);
                state.records[recordKey] = data;


                const result = modeManager.changeMode(state, 'view');

                if (result.canProceed) {
                    setNewActiveRecord(state, recordKey);
                    setSuccess(state, 'CREATE');
                }
            },

            startRecordUpdate: (state: EntityState<TEntity>) => {
                entityLogger.log('debug', 'startRecordUpdate');
                if (state.selection.selectedRecords.length > 0) {
                    const result = modeManager.changeMode(state, 'update');
                    if (!result.canProceed) {
                        state.loading.error = {
                            message: result.error || 'Cannot start update',
                            code: 400,
                        };
                        return;
                    }
                }
            },

            startRecordUpdateById: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
                entityLogger.log('debug', 'startRecordUpdateById');

                // First set the provided record as active
                setNewActiveRecord(state, action.payload);

                // Then proceed with the original update logic
                if (state.selection.selectedRecords.length > 0) {
                    const result = modeManager.changeMode(state, 'update');
                    if (!result.canProceed) {
                        state.loading.error = {
                            message: result.error || 'Cannot start update',
                            code: 400,
                        };
                        return;
                    }
                }
            },
            directCreateRecord: (state: EntityState<TEntity>, action: PayloadAction<DirectCreateRecordPayload>) => {
                entityLogger.log('debug', 'slice - directCreateRecord', action.payload);
                setLoading(state, 'DIRECT_CREATE');
            },

            directCreateRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
                entityLogger.log('debug', 'directCreateRecordSuccess', action.payload);
                const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
                state.records[recordKey] = action.payload;
                setSuccess(state, 'DIRECT_CREATE');
            },

            directUpdateRecord: (state: EntityState<TEntity>, action: PayloadAction<DirectUpdateRecordPayload>) => {
                entityLogger.log('debug', 'slice - directUpdateRecord', action.payload);
                setLoading(state, 'DIRECT_UPDATE');
            },

            directUpdateRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
                entityLogger.log('debug', 'directUpdateRecordSuccess', action.payload);
                const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
                state.records[recordKey] = action.payload;
                setSuccess(state, 'DIRECT_UPDATE');
            },

            updateRecord: (state: EntityState<TEntity>, action: PayloadAction<UpdateRecordPayload>) => {
                entityLogger.log('debug', 'slice - updateRecord', action.payload);
                const matrxRecordId = action.payload.matrxRecordId;
                const unsavedData = state.unsavedRecords[matrxRecordId];
                if (!unsavedData) {
                    entityLogger.log('error', 'No unsaved changes found for record', matrxRecordId);
                    return;
                }

                setLoading(state, 'UPDATE');
            },

            updateRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<EntityData<TEntity>>) => {
                entityLogger.log('debug', 'updateRecordSuccess', action.payload);
                const recordKey = createRecordKey(state.entityMetadata.primaryKeyMetadata, action.payload);
                state.records[recordKey] = action.payload;

                // Let mode manager handle the transition back to view
                const result = modeManager.changeMode(state, 'view');
                if (result.canProceed) {
                    setNewActiveRecord(state, recordKey);
                    setSuccess(state, 'UPDATE');
                }
            },

            optimisticUpdate: (
                state: EntityState<TEntity>,
                action: PayloadAction<{
                    record: EntityData<TEntity>;
                    rollback?: EntityData<TEntity>;
                }>
            ) => {
                const { record, rollback } = action.payload;
                const recordKey: MatrxRecordId = createRecordKey(state.entityMetadata.primaryKeyMetadata, record);
                entityLogger.log('debug', 'optimisticUpdate', { record, rollback });

                if (rollback) {
                    state.history.past.push({
                        timestamp: new Date().toISOString(),
                        operation: 'update',
                        data: record,
                        previousData: rollback,
                        metadata: { reason: 'optimistic_update' },
                    });
                }

                state.records[recordKey] = record;
                state.flags.isModified = true;
                // state.flags.hasUnsavedChanges = true;
            },

            updateUnsavedField: (
                state: EntityState<TEntity>,
                action: PayloadAction<{
                    recordId: MatrxRecordId;
                    field: string;
                    value: any;
                }>
            ) => {
                const { recordId, field, value } = action.payload;
                entityLogger.log('debug', 'updateUnsavedField', { recordId, field, value });
                const existingRecord = state.unsavedRecords[recordId];
                entityLogger.log('debug', 'existingRecord', existingRecord);
                if (existingRecord?.[field] !== value) {
                    entityLogger.log('debug', 'updating unsaved record');
                    state.unsavedRecords[recordId] = {
                        ...existingRecord,
                        [field]: value,
                    };
                    if (!state.flags.hasUnsavedChanges) {
                        state.flags.hasUnsavedChanges = true;
                        if (state.flags.operationMode !== 'create') {
                            state.flags.operationMode = 'update';
                        }
                    }
                }
                entityLogger.log('debug',"Record State After Update: ", state.unsavedRecords[recordId]);
            },
            updateUnsavedFields: (
                state: EntityState<TEntity>,
                action: PayloadAction<{
                    updates: Array<{
                        recordId: MatrxRecordId;
                        field: string;
                        value: any;
                    }>;
                }>
            ) => {
                action.payload.updates.forEach(({ recordId, field, value }) => {
                    const existingRecord = state.unsavedRecords[recordId];
                    if (existingRecord?.[field] !== value) {
                        state.unsavedRecords[recordId] = {
                            ...existingRecord,
                            [field]: value,
                        };
                        if (!state.flags.hasUnsavedChanges) {
                            state.flags.hasUnsavedChanges = true;
                            if (state.flags.operationMode !== 'create') {
                                state.flags.operationMode = 'update';
                            }
                        }
                    }
                });
            },
            addPendingOperation: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
                if (!state.pendingOperations.includes(action.payload)) {
                    state.pendingOperations.push(action.payload);
                }
            },
            removePendingOperation: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId>) => {
                state.pendingOperations = state.pendingOperations.filter((matrxRecordId) => matrxRecordId !== action.payload);
            },
            clearPendingOperations: (state: EntityState<TEntity>) => {
                state.pendingOperations = [];
            },

            cancelOperation: (state: EntityState<TEntity>) => {
                entityLogger.log('debug', 'cancelOperation');
                const result = modeManager.changeMode(state, 'view');
                if (result.canProceed) {
                    resetFlag(state, state.flags.operationMode === 'create' ? 'CREATE' : 'UPDATE');
                }
            },

            deleteRecord: (state: EntityState<TEntity>, action: PayloadAction<DeleteRecordPayload>) => {
                entityLogger.log('debug', 'deleteRecord', action.payload);
                setLoading(state, 'DELETE');
            },
            deleteRecordSuccess: (state: EntityState<TEntity>, action: PayloadAction<{ matrxRecordId: MatrxRecordId }>) => {
                const recordKey = action.payload.matrxRecordId;
                entityLogger.log('debug', 'deleteRecordSuccess', { recordKey });
                delete state.records[recordKey];
                handleSelectionForDeletedRecord(state, recordKey);

                // Let mode manager handle any necessary cleanup
                const result = modeManager.changeMode(state, 'view');
                if (result.canProceed && state.selection.lastActiveRecord && state.records[state.selection.lastActiveRecord]) {
                    setNewActiveRecord(state, state.selection.lastActiveRecord);
                }
                checkAndUpdateUnsavedChanges(state);

                setSuccess(state, 'DELETE');
                state.flags.isModified = true;
            },

            setValidated: (state) => {
                entityLogger.log('debug', 'setValidated');
                state.flags.isValidated = true;
            },

            resetValidated: (state) => {
                entityLogger.log('debug', 'resetValidated');
                state.flags.isValidated = false;
            },

            invalidateRecord: (state: EntityState<TEntity>, action: PayloadAction<string>) => {
                const recordKey = action.payload;
                entityLogger.log('debug', 'invalidateRecord', { recordKey });

                if (state.records[recordKey]) {
                    state.cache.invalidationTriggers.push(recordKey);
                    state.cache.stale = true;
                }
            },

            // Core Record Management
            setRecords: (state: EntityState<TEntity>, action: PayloadAction<Record<string, Draft<EntityData<TEntity>>>>) => {
                entityLogger.log('debug', 'setRecords', action.payload);
                state.records = action.payload;
                state.loading.lastOperation = 'FETCH';
                const cacheKey = state.entityMetadata.primaryKeyMetadata.database_fields.join('::');
                state.cache.lastFetched[cacheKey] = new Date().toISOString();
                state.cache.stale = false;
            },

            upsertRecords: (state: EntityState<TEntity>, action: PayloadAction<{ recordKey: MatrxRecordId; record: EntityData<TEntity> }[]>) => {
                action.payload.forEach(({ recordKey, record }) => {
                    state.records[recordKey] = {
                        ...(state.records[recordKey] || {}),
                        ...record,
                    };
                });

                state.flags.isModified = true;
                state.flags.hasUnsavedChanges = true;
            },

            removeRecords: (state: EntityState<TEntity>, action: PayloadAction<MatrxRecordId[]>) => {
                entityLogger.log('debug', 'removeRecords', action.payload);

                action.payload.forEach((recordKey) => {
                    delete state.records[recordKey];
                });

                state.quickReference.records = state.quickReference.records.filter((quickRefRecord) => !action.payload.includes(quickRefRecord.recordKey));

                state.flags.isModified = true;
                state.flags.hasUnsavedChanges = true;
            },

            // History Management
            pushToHistory: (state, action: PayloadAction<Draft<HistoryEntry<TEntity>>>) => {
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
                    const { primaryKeyMetadata } = state.entityMetadata;

                    if (Array.isArray(lastEntry.previousData)) {
                        lastEntry.previousData.forEach((record) => {
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
                    const { primaryKeyMetadata } = state.entityMetadata;

                    if (Array.isArray(nextEntry.data)) {
                        nextEntry.data.forEach((record) => {
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
            setPage: (state, action: PayloadAction<number>) => {
                entityLogger.log('debug', 'setPage', action.payload);
                state.pagination.page = action.payload;
                state.flags.needsRefresh = true;
            },

            setPageSize: (state, action: PayloadAction<number>) => {
                entityLogger.log('debug', 'setPageSize', action.payload);
                state.pagination.pageSize = action.payload;
                state.pagination.page = 1;
                state.flags.needsRefresh = true;
            },

            // Filter Management
            setFilters: (state, action: PayloadAction<FilterPayload>) => {
                const { conditions, replace, temporary } = action.payload;
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

            setSorting: (state, action: PayloadAction<SortPayload>) => {
                const { field, direction, append } = action.payload;
                const newSort = { field, direction };
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
            initializeEntityMetadata: (state, action: PayloadAction<EntityMetadata>) => {
                entityLogger.log('debug', 'initializeEntityMetadata', action.payload);
                state.entityMetadata = action.payload;
            },

            updateEntityMetadata: (state, action: PayloadAction<Partial<EntityMetadata>>) => {
                entityLogger.log('debug', 'updateEntityMetadata', action.payload);
                state.entityMetadata = {
                    ...state.entityMetadata,
                    ...action.payload,
                };
            },

            // Loading State Management
            setLoading: (state, action: PayloadAction<boolean>) => {
                entityLogger.log('debug', 'setLoading', action.payload);
                state.loading.loading = action.payload;
                if (!action.payload) {
                    state.loading.lastOperation = undefined;
                }
            },

            setError: (state, action: PayloadAction<LoadingState['error']>) => {
                entityLogger.log('error', 'setError', action.payload);
                state.loading.error = action.payload;
                state.loading.loading = false;
            },

            // Subscription Management
            setSubscription: (state, action: PayloadAction<Partial<SubscriptionConfig>>) => {
                entityLogger.log('debug', 'setSubscription', action.payload);
                state.subscription = {
                    ...state.subscription,
                    ...action.payload,
                };
            },

            // Flag Management
            setFlags: (state, action: PayloadAction<Partial<EntityState<TEntity>['flags']>>) => {
                entityLogger.log('debug', 'setFlags', action.payload);
                state.flags = {
                    ...state.flags,
                    ...action.payload,
                };
            },

            // Add the action to fetch metrics
            fetchMetrics: (state, action: PayloadAction<{ timeRange?: string }>) => {
                entityLogger.log('debug', 'fetchMetrics', action.payload);
                state.loading.loading = true;
                state.loading.error = null;
            },

            // Add the success handler
            fetchMetricsSuccess: (state, action: PayloadAction<EntityMetrics>) => {
                entityLogger.log('debug', 'fetchMetricsSuccess', action.payload);
                state.metrics = action.payload;
                state.loading.loading = false;
            },

            // Add the set metrics action
            setMetrics: (state, action: PayloadAction<Partial<EntityMetrics>>) => {
                entityLogger.log('debug', 'setMetrics', action.payload);
                state.metrics = {
                    ...state.metrics,
                    ...action.payload,
                    lastUpdated: new Date().toISOString(),
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

        extraReducers: (builder) => {
            builder
                // Add handlers for the new thunk
                .addCase(getOrFetchSelectedRecordsThunk.pending, (state) => {
                    entityLogger.log('debug', 'getOrFetchSelectedRecordsThunk pending');
                    setLoading(state, 'GET_OR_FETCH_RECORDS');
                })
                .addCase(getOrFetchSelectedRecordsThunk.fulfilled, (state) => {
                    entityLogger.log('debug', 'getOrFetchSelectedRecordsThunk fulfilled');
                    setSuccess(state, 'GET_OR_FETCH_RECORDS');
                    clearError(state);
                })
                .addCase(getOrFetchSelectedRecordsThunk.rejected, (state, action) => {
                    entityLogger.log('error', 'getOrFetchSelectedRecordsThunk rejected', action.error);
                    setError(state, {
                        payload: {
                            message: action.error.message || 'An error occurred during fetch by record IDs.',
                            code: action.error.code,
                        }
                    });
                })
                // Keep existing matchers
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
    });

    return {
        reducer: slice.reducer,
        actions: slice.actions,
    };
};

export type EntitySlice<TEntity extends EntityKeys> = ReturnType<typeof createEntitySlice<TEntity>>;
export type EntityActions<TEntity extends EntityKeys> = EntitySlice<TEntity>['actions'];




