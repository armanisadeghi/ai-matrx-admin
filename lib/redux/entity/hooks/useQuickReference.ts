import {useCallback, useEffect, useMemo, useState} from 'react';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {createEntitySlice} from '@/lib/redux/entity/slice';
import {
    OperationCallbacks,
    useEntitySelection,
    UseEntitySelectionReturn
} from '@/lib/redux/entity/hooks/useEntitySelection';
import {
    LoadingState,
    EntityError,
    QuickReferenceRecord,
    QuickReferenceState,
    MatrxRecordId,
    EntityMetadata,
    EntityStateField, PrimaryKeyMetadata,
} from '@/lib/redux/entity/types';
import {entityDefaultSettings} from "@/lib/redux/entity/defaults";
import {Draft} from "@reduxjs/toolkit";
import EntityLogger from '../entityLogger';

export interface UseEntityQuickReferenceResult<TEntity extends EntityKeys> extends Omit<UseEntitySelectionReturn<TEntity>, 'selectedRecords'> {
    // ... (existing interface properties)
    isMultiSelectMode: boolean;
    toggleMultiSelectMode: () => void;

    getOrFetchSelectedRecords: (payload: { recordIds: MatrxRecordId[] }) => void,


    // Metadata
    entityDisplayName: string;
    fieldInfo: EntityStateField[];

    // Quick Reference Data
    quickReferenceRecords: QuickReferenceRecord[];
    quickReferenceState: QuickReferenceState;
    selectedQuickReference: QuickReferenceRecord | null;
    primaryKeyMetadata: PrimaryKeyMetadata;
    // Loading States
    loading: LoadingState['loading'];
    error: LoadingState['error'];
    lastOperation: LoadingState['lastOperation'];

    // Record Management
    handleMultipleSelections: (primaryKeyValues: Record<string, any>) => void;
    handleSingleSelection: (primaryKeyValues: Record<string, any>) => void;

    // CRUD Operations
    createRecord: (
        data: EntityData<TEntity>,
        options?: OperationCallbacks<EntityData<TEntity>>
    ) => Promise<void>;

    updateRecord: (
        data: Partial<EntityData<TEntity>>,
        options?: OperationCallbacks<EntityData<TEntity>>
    ) => Promise<void>;

    deleteRecord: (
        options?: OperationCallbacks
    ) => Promise<void>;

    // Validation Management
    handleSetValidated: (isValid: boolean) => void;
    // State Management
    isValidated: boolean;
    isModified: boolean;
    hasUnsavedChanges: boolean;

    selectedQuickReferences: QuickReferenceRecord[];

}

export function useEntityQuickReference<TEntity extends EntityKeys>(
    entityKey: TEntity
): UseEntityQuickReferenceResult<TEntity> {

    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);


    const dispatch = useAppDispatch();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = useMemo(() => createEntitySlice(entityKey, {} as any), [entityKey]);

    // Selection Management
    const selection = useEntitySelection(entityKey);

    // State Selectors
    const entityDisplayName = useAppSelector(selectors.selectEntityDisplayName);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const quickReferenceRecords = useAppSelector(selectors.selectQuickReference);
    const quickReferenceState = useAppSelector(state => selectors.selectEntity(state).quickReference);
    const loadingState = useAppSelector(state => selectors.selectEntity(state).loading);
    const entityFlags = useAppSelector(state => selectors.selectEntity(state).flags);
    const isValidated = useAppSelector(selectors.selectIsValidated);
    const allRecords = useAppSelector(selectors.selectAllRecords);
    const primaryKeyMetadata = useAppSelector(selectors.selectPrimaryKeyMetadata);
    const selectedRecord = useAppSelector(selectors.selectActiveRecord);
    const fetchOneSuccess = useAppSelector(selectors.selectFetchOneSuccess);

    const addToSelection = useCallback((record: EntityData<TEntity>) => {
        dispatch(actions.addToSelection(record));
    }, [dispatch, actions]);

    const clearSelection = useCallback(() => {
        dispatch(actions.clearSelection());
    }, [dispatch, actions]);

    const getOrFetchSelections = useCallback(() => {
        dispatch(actions.getOrFetchSelectedRecords());
    }, [dispatch, actions]);



    const toggleMultiSelectMode = useCallback(() => {
        setIsMultiSelectMode(prev => !prev);
        clearSelection();
    }, [clearSelection]);


    const handleSingleSelection = useCallback(
        (quickRef: QuickReferenceRecord) => {
            clearSelection();
            dispatch(actions.getOrFetchSelectedRecords({ recordIds: [quickRef.recordKey] }));
        },
        [dispatch, actions, clearSelection]
    );

    // Handle multiple selection
    const handleMultipleSelections = useCallback(
        (quickRef: QuickReferenceRecord) => {
            dispatch(actions.getOrFetchSelectedRecords({
                recordIds: [...selection.selectedRecords, quickRef.recordKey]
            }));
        },
        [dispatch, actions, selection.selectedRecords]
    );

    // Debug logging effect
    useEffect(() => {
        if (EntityLogger.shouldLog('debug')) {
            EntityLogger.log(
                'debug',
                'Selection state changed',
                'useEntityQuickReference',
                {selectedQuickReference, loadingState}
            );
        }
    }, [selectedQuickReference, loadingState]);

    // Quick Reference fetching effect
    useEffect(() => {
        if (!quickReferenceState.fetchComplete) {
            dispatch(actions.fetchQuickReference({
                maxRecords: entityDefaultSettings.maxQuickReferenceRecords
            }));
        }
    }, [entityKey]);

    // Operation callbacks effect
    useEffect(() => {
        const currentOperation = loadingState.lastOperation;
        if (!loadingState.loading && currentOperation) {
            if (currentOperation === 'create' || currentOperation === 'update') {
                const operationCallbacks = selection.getOperationCallbacks<EntityData<TEntity>>();

                if (loadingState.error && operationCallbacks?.onError) {
                    operationCallbacks.onError(loadingState.error);
                } else if (!loadingState.error && operationCallbacks?.onSuccess && selectedRecord) {
                    operationCallbacks.onSuccess(selectedRecord);
                }
            } else if (currentOperation === 'delete') {
                const operationCallbacks = selection.getOperationCallbacks<void>();

                if (loadingState.error && operationCallbacks?.onError) {
                    operationCallbacks.onError(loadingState.error);
                } else if (!loadingState.error && operationCallbacks?.onSuccess) {
                    operationCallbacks.onSuccess();
                }
            }

            // Clear callbacks after execution
            selection.clearOperationCallbacks();
        }
    }, [loadingState, selectedRecord, selection]);

    // Create Record Management
    const createRecord = useCallback(
        async (
            data: EntityData<TEntity>,
            options?: OperationCallbacks<EntityData<TEntity>>
        ) => {
            if (!isValidated) {
                const error: EntityError = {
                    message: 'Validation must be completed before creating record',
                    code: 400,
                    lastOperation: 'create'
                };
                options?.onError?.(error);
                return;
            }

            selection.setOperationCallbacks(options);
            dispatch(actions.createRecord(data));
        },
        [dispatch, actions, isValidated, selection]
    );

    const handleSetValidated = (isValid: boolean) => {
        if (isValid) {
            dispatch(actions.setValidated());
        } else {
            dispatch(actions.resetValidated());
        }
    };

    // Update Record Management
    const updateRecord = useCallback(
        async (
            data: Partial<EntityData<TEntity>>,
            options?: OperationCallbacks<EntityData<TEntity>>
        ) => {
            if (!isValidated) {
                const error: EntityError = {
                    message: 'Validation must be completed before updating record',
                    code: 400,
                    lastOperation: 'update'
                };
                options?.onError?.(error);
                return;
            }

            if (!selectedRecord || !selectedQuickReference) {
                const error: EntityError = {
                    message: 'No record selected for update',
                    code: 400,
                    lastOperation: 'update'
                };
                options?.onError?.(error);
                return;
            }

            selection.setOperationCallbacks(options);

            // Store original record for potential rollback
            const originalRecord = {...selectedRecord};

            // Create optimistic update
            const optimisticRecord = {
                ...selectedRecord,
                ...data
            } as Draft<EntityData<TEntity>>;

            // Perform optimistic update
            dispatch(actions.optimisticUpdate({
                record: optimisticRecord,
                rollback: originalRecord
            }));

            // Dispatch actual update
            dispatch(actions.updateRecord({
                primaryKeyValues: selectedQuickReference.primaryKeyValues,
                data
            }));
        },
        [dispatch, actions, selectedRecord, selectedQuickReference, isValidated, selection]
    );

// Delete Record Management
    const deleteRecord = useCallback(
        async (options?: OperationCallbacks) => {
            if (!selectedRecord || !selectedQuickReference) {
                const error: EntityError = {
                    message: 'No record selected for deletion',
                    code: 400,
                    lastOperation: 'delete'
                };
                options?.onError?.(error);
                return;
            }

            // Verify record matches before deletion
            const currentRecord = useAppSelector(state =>
                selectors.selectRecordByPrimaryKey(state, selectedQuickReference.primaryKeyValues)
            );

            if (currentRecord !== selectedRecord) {
                const error: EntityError = {
                    message: 'Selected record mismatch - aborting deletion',
                    code: 409,
                    lastOperation: 'delete'
                };
                options?.onError?.(error);
                return;
            }

            selection.setOperationCallbacks(options);
            dispatch(actions.deleteRecord({
                primaryKeyValues: selectedQuickReference.primaryKeyValues
            }));
        },
        [dispatch, actions, selectedRecord, selectedQuickReference, selectors, selection]
    );

    return {
        // Metadata
        entityDisplayName,
        fieldInfo,

        // Quick Reference Data
        quickReferenceRecords,
        quickReferenceState,
        selectedQuickReference,
        selectedQuickReferences,
        primaryKeyMetadata,

        // Selection State
        ...selection,
        isMultiSelectMode,
        toggleMultiSelectMode,

        // Loading States
        loading: loadingState.loading,
        error: loadingState.error,
        lastOperation: loadingState.lastOperation,

        // Record Management
        handleMultipleSelections,
        handleSingleSelection,
        clearSelection,

        // CRUD Operations
        createRecord,
        updateRecord,
        deleteRecord,

        // Validation Management
        handleSetValidated,

        // State Management
        isValidated,
        isModified: entityFlags.isModified,
        hasUnsavedChanges: entityFlags.hasUnsavedChanges
    };
}