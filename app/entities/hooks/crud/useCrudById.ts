// lib/redux/entity/useEntity.ts
'use client';

import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { EntityKeys } from '@/types/entityTypes';
import { EntityOperationMode, EntityRecordMap, FlexibleQueryOptions, MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { Callback, callbackManager } from '@/utils/callbackManager';
import { UpdateRecordPayload, useEntityTools } from '@/lib/redux';

export const useEntitySelectionCrud = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const dispatch = useAppDispatch();
    const { store, actions, selectors } = useEntityTools(entityKey);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const hasUnsavedChanges = useAppSelector(selectors.selectHasUnsavedChanges);
    const operationMode = useAppSelector(selectors.selectOperationMode);
    const pendingOperations = useAppSelector(selectors.selectPendingOperations);
    const flags = useAppSelector(selectors.selectEntityFlags);
    const dataState = useAppSelector(selectors.selectDataState);

    const isOperationPending = useCallback((matrxRecordId: MatrxRecordId) => pendingOperations.includes(matrxRecordId), [pendingOperations]);

    const hasSelectedRecordsPending = useMemo(
        () => selectedRecordIds.some((matrxRecordId) => pendingOperations.includes(matrxRecordId)),
        [selectedRecordIds, pendingOperations]
    );

    // Existing memoized selectors
    const unsavedRecordById = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) => selectors.selectUnsavedRecordById(store.getState(), matrxRecordId);
    }, [selectors, store]);

    const effectiveRecordById = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) => selectors.selectEffectiveRecordById(store.getState(), matrxRecordId);
    }, [selectors, store]);

    const isTemporaryRecordId = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) => selectors.selectIsTemporaryRecordId(store.getState(), matrxRecordId);
    }, [selectors, store]);

    // Operation Mode Management
    const startCreateMode = useCallback(
        (count: number = 1) => {
            dispatch(actions.startRecordCreation({ count }));
        },
        [dispatch, actions]
    );

    const startUpdateMode = useCallback(() => {
        if (activeRecordId || selectedRecordIds.length > 0) {
            dispatch(actions.startRecordUpdate());
        }
    }, [dispatch, actions, activeRecordId, selectedRecordIds]);

    const setMode = useCallback(
        (mode: EntityOperationMode) => {
            switch (mode) {
                case 'create':
                    startCreateMode();
                    break;
                case 'update':
                    startUpdateMode();
                    break;
                case 'delete':
                    dispatch(actions.setOperationMode('delete'));
                    break;
                case 'view':
                    dispatch(actions.setOperationMode('view'));
                    break;
            }
        },
        [dispatch, actions, startCreateMode, startUpdateMode]
    );

    const cancelOperation = useCallback(() => {
        dispatch(actions.cancelOperation());
    }, [dispatch, actions]);

    // Field Updates
    const updateField = useCallback(
        (recordId: MatrxRecordId, field: string, value: any) => {
            dispatch(actions.updateUnsavedField({ recordId, field, value }));
        },
        [dispatch, actions]
    );

    // CRUD Operations using callback manager
    const handleCreate = useCallback(
        (createPayloadArray: FlexibleQueryOptions[], callback?: Callback) => {
            createPayloadArray.forEach((createPayload) => {
                dispatch(actions.addPendingOperation(createPayload.tempRecordId));
                const wrappedCallback = (result: { success: boolean; error?: any }) => {
                    callback?.(result);
                };
                const callbackId = callbackManager.register(wrappedCallback);
                dispatch(actions.createRecord({ ...createPayload, callbackId }));
            });

            return true;
        },
        [dispatch, actions]
    );

    const handleUpdate = useCallback(
        (recordId: MatrxRecordId, callback?: Callback) => {
            dispatch(actions.addPendingOperation(recordId));
            const wrappedCallback = (result: { success: boolean; error?: any }) => {
                dispatch(actions.removePendingOperation(recordId));
                callback?.(result);
            };
            const callbackId = callbackManager.register(wrappedCallback);

            const payload: UpdateRecordPayload = {
                matrxRecordId: recordId,
                callbackId,
            };
            dispatch(actions.updateRecord(payload));
        },
        [dispatch, actions]
    );

    const handleBatchUpdate = useCallback(
        (recordIds?: MatrxRecordId[], callback?: Callback) => {
            const targetRecords = recordIds || selectedRecordIds;
            if (targetRecords.length === 0) return false;

            targetRecords.forEach((recordId) => {
                dispatch(actions.addPendingOperation(recordId));
                const wrappedCallback = (result: { success: boolean; error?: any }) => {
                    dispatch(actions.removePendingOperation(recordId));
                    callback?.(result);
                };
                const callbackId = callbackManager.register(wrappedCallback);
                dispatch(actions.updateRecord({ matrxRecordId: recordId, callbackId }));
            });

            return true;
        },
        [dispatch, actions]
    );

    const deleteRecord = React.useCallback(
        (matrxRecordId: MatrxRecordId, callback?: Callback) => {
            const wrappedCallback = (result: { success: boolean; error?: any }) => {
                callback?.(result);
            };
            const callbackId = callbackManager.register(wrappedCallback);
            dispatch(actions.deleteRecord({ matrxRecordId, callbackId }));
        },
        [actions, dispatch]
    );

    const handleDelete = useCallback(
        (recordId: MatrxRecordId, callback?: Callback) => {
            dispatch(actions.addPendingOperation(recordId));
            const wrappedCallback = (result: { success: boolean; error?: any }) => {
                dispatch(actions.removePendingOperation(recordId));
                if (callback) {
                    callback(result);
                }
            };
            deleteRecord(recordId, wrappedCallback);
        },
        [dispatch, actions]
    );

    const handleBatchDelete = useCallback(
        (recordIds?: MatrxRecordId[], callback?: Callback) => {
            const targetRecords = recordIds || selectedRecordIds;
            if (targetRecords.length === 0) return false;

            targetRecords.forEach((recordId) => {
                dispatch(actions.addPendingOperation(recordId));
                const wrappedCallback = (result: { success: boolean; error?: any }) => {
                    dispatch(actions.removePendingOperation(recordId));
                    callback?.(result);
                };
                const callbackId = callbackManager.register(wrappedCallback);
                dispatch(actions.deleteRecord({ matrxRecordId: recordId, callbackId }));
            });

            return true;
        },
        [dispatch, actions]
    );

    const updateSelectedRecords = useCallback(() => {
        if (selectedRecordIds.length === 0) return false;

        const recordsToUpdate = selectedRecordIds.filter((recordId) => {
            const unsavedData = unsavedRecordById(recordId);
            const originalData = effectiveRecordById(recordId);

            if (!unsavedData || !originalData) return false;

            return Object.keys(unsavedData).some((key) => unsavedData[key] !== originalData[key]);
        });

        if (recordsToUpdate.length === 0) return false;

        return handleBatchUpdate(recordsToUpdate);
    }, [selectedRecordIds, handleBatchUpdate, unsavedRecordById, effectiveRecordById]);

    const deleteSelectedRecords = useCallback(() => {
        if (selectedRecordIds.length === 0) return false;
        return handleBatchDelete(selectedRecordIds);
    }, [selectedRecordIds, handleBatchDelete]);

    const effectiveRecordOrDefaults = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) => selectors.selectEffectiveRecordOrDefaults(store.getState(), matrxRecordId);
    }, [selectors, store]);

    const selectedRecordsOrDefaultsWithKeys = useMemo(() => {
        return selectedRecordIds.reduce((acc, recordId) => {
            // First try to get the actual record
            const actualRecord = effectiveRecordById(recordId);
            if (actualRecord) {
                acc[recordId] = actualRecord;
                return acc;
            }

            // Only fall back to defaults if no actual record exists
            const defaultRecord = effectiveRecordOrDefaults(recordId);
            if (defaultRecord) {
                acc[recordId] = defaultRecord;
            }
            return acc;
        }, {} as EntityRecordMap<TEntity>);
    }, [selectedRecordIds, effectiveRecordById, effectiveRecordOrDefaults]);

    const selectedRecordsCrud = useMemo(
        () => ({
            updateRecord: updateSelectedRecords,
            deleteRecord: deleteSelectedRecords,
            recordIds: selectedRecordIds,
            recordData: selectedRecords,
        }),
        [updateSelectedRecords, deleteSelectedRecords, selectedRecordIds, selectedRecords]
    );

    const CrudById = useCallback(
        (recordId: MatrxRecordId) => ({
            startUpdateMode,
            updateField: (field: string, value: any) => updateField(recordId, field, value),
            updateRecord: () => handleUpdate(recordId),
            deleteRecord: () => handleDelete(recordId),
        }),
        [startUpdateMode, updateField, handleUpdate, handleDelete]
    );

    // Return same interface
    return {
        startCreateMode,
        startUpdateMode,
        cancelOperation,
        updateField,
        handleCreate,
        handleUpdate,
        handleBatchUpdate,
        handleDelete,
        handleBatchDelete,
        updateSelectedRecords,
        deleteSelectedRecords,
        isOperationPending,

        isLoading: dataState.isLoading,
        hasUnsavedChanges,
        operationMode,

        getUnsavedRecord: unsavedRecordById,
        getEffectiveRecord: effectiveRecordById,
        getEffectiveRecordOrDefaults: effectiveRecordOrDefaults,
        isTemporaryRecordId,
        hasSelectedRecordsPending,
        flags,
        dataState,

        setMode,

        selectedRecordsCrud,
        CrudById,

        activeRecordId,
        selectedRecordIds,
        selectedRecordsOrDefaultsWithKeys,
    };
};
