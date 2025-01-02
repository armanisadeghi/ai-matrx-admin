// lib/redux/entity/useEntity.ts
'use client';


import * as React from 'react';
import {useCallback, useMemo} from 'react';
import {useAppDispatch, useAppSelector, useAppStore} from '@/lib/redux/hooks';
import {EntityKeys} from '@/types/entityTypes';
import {EntityOperationMode, FlexibleQueryOptions, MatrxRecordId,} from '@/lib/redux/entity/types/stateTypes';
import {getEntitySlice} from '@/lib/redux/entity/entitySlice';
import {Callback, callbackManager} from "@/utils/callbackManager";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import { UpdateRecordPayload } from '@/lib/redux';

export const useEntityCrudFinal = <TEntity extends EntityKeys>(entityKey: TEntity) => {

    console.log(' === useEntityCrudFinal ===')
    const dispatch = useAppDispatch();
    const store = useAppStore();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);

    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const hasUnsavedChanges = useAppSelector(selectors.selectHasUnsavedChanges);
    const operationMode = useAppSelector(selectors.selectOperationMode);


    const pendingOperations = useAppSelector(selectors.selectPendingOperations);
    const flags = useAppSelector(selectors.selectEntityFlags);
    const dataState = useAppSelector(selectors.selectDataState);

    const isOperationPending = useCallback((matrxRecordId: MatrxRecordId) =>
            pendingOperations.includes(matrxRecordId)
        , [pendingOperations]);

    const hasSelectedRecordsPending = useMemo(() =>
            selectedRecordIds.some(matrxRecordId => pendingOperations.includes(matrxRecordId))
        , [selectedRecordIds, pendingOperations]);

    // Existing memoized selectors
    const unsavedRecordById = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) =>
            selectors.selectUnsavedRecordById(store.getState(), matrxRecordId);
    }, [selectors, store]);

    const effectiveRecordById = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) =>
            selectors.selectEffectiveRecordById(store.getState(), matrxRecordId);
    }, [selectors, store]);

    const isTemporaryRecordId = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) =>
            selectors.selectIsTemporaryRecordId(store.getState(), matrxRecordId);
    }, [selectors, store]);

    // Operation Mode Management
    const startCreateMode = useCallback((count: number = 1) => {
        dispatch(actions.startRecordCreation({count}));
    }, [dispatch, actions]);


    const startUpdateMode = useCallback(() => {
        if (activeRecordId || selectedRecordIds.length > 0) {
            dispatch(actions.startRecordUpdate());
        }
    }, [dispatch, actions, activeRecordId, selectedRecordIds]);

    const startDeleteMode = useCallback(() => {
        dispatch(actions.setOperationMode("delete"));
    }, [dispatch, actions]);

    const startViewMode = useCallback(() => {
        dispatch(actions.setOperationMode("view"));
    }, [dispatch, actions]);

    const setMode = useCallback((mode: EntityOperationMode) => {
        switch (mode) {
            case "create":
                startCreateMode();
                break;
            case "update":
                startUpdateMode();
                break;
            case "delete":
                dispatch(actions.setOperationMode("delete"));
                break;
            case "view":
                dispatch(actions.setOperationMode("view"));
                break;
        }
    }, [dispatch, actions, startCreateMode, startUpdateMode]);


    const cancelOperation = useCallback(() => {
        dispatch(actions.cancelOperation());
    }, [dispatch, actions]);

    // Field Updates
    const updateField = useCallback((
        recordId: MatrxRecordId,
        field: string,
        value: any
    ) => {
        dispatch(actions.updateUnsavedField({recordId, field, value}));
    }, [dispatch, actions]);


    const updateFieldForActiveRecord = useCallback((
        field: string,
        value: any
    ) => {
        dispatch(actions.updateUnsavedField({
            recordId: activeRecordId,
            field,
            value
        }));
    }, [dispatch, actions, activeRecordId]);


    // CRUD Operations using callback manager
    const handleCreate = useCallback((createPayloadArray: FlexibleQueryOptions[], callback?: Callback) => {
        createPayloadArray.forEach(createPayload => {
            dispatch(actions.addPendingOperation(createPayload.tempRecordId));
            const wrappedCallback = (result: { success: boolean; error?: any }) => {
                callback?.(result);
            };
            const callbackId = callbackManager.register(wrappedCallback);
            dispatch(actions.createRecord({...createPayload, callbackId}));
        });

        return true;
    }, [dispatch, actions]);

    const handleUpdate = useCallback((recordId: MatrxRecordId, callback?: Callback) => {
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
    }, [dispatch, actions]);

    const handleBatchUpdate = useCallback((recordIds?: MatrxRecordId[], callback?: Callback) => {
        const targetRecords = recordIds || selectedRecordIds;
        if (targetRecords.length === 0) return false;

        targetRecords.forEach(recordId => {
            dispatch(actions.addPendingOperation(recordId));
            const wrappedCallback = (result: { success: boolean; error?: any }) => {
                dispatch(actions.removePendingOperation(recordId));
                callback?.(result);
            };
            const callbackId = callbackManager.register(wrappedCallback);
            dispatch(actions.updateRecord({matrxRecordId: recordId, callbackId}));
        });

        return true;
    }, [dispatch, actions]);

    const deleteRecord = React.useCallback((matrxRecordId: MatrxRecordId, callback?: Callback) => {
        const wrappedCallback = (result: { success: boolean; error?: any }) => {
            callback?.(result);
        };
        const callbackId = callbackManager.register(wrappedCallback);
        dispatch(actions.deleteRecord({matrxRecordId, callbackId,}));
    }, [actions, dispatch]);


    const handleDelete = useCallback((recordId: MatrxRecordId, callback?: Callback) => {
        dispatch(actions.addPendingOperation(recordId));
        const wrappedCallback = (result: { success: boolean; error?: any }) => {
            dispatch(actions.removePendingOperation(recordId));
            if (callback) {
                callback(result);
            }
        };
        deleteRecord(recordId, wrappedCallback);
    }, [dispatch, actions]);


    const handleBatchDelete = useCallback((recordIds?: MatrxRecordId[], callback?: Callback) => {
        const targetRecords = recordIds || selectedRecordIds;
        if (targetRecords.length === 0) return false;

        targetRecords.forEach(recordId => {
            dispatch(actions.addPendingOperation(recordId));
            const wrappedCallback = (result: { success: boolean; error?: any }) => {
                dispatch(actions.removePendingOperation(recordId));
                callback?.(result);
            };
            const callbackId = callbackManager.register(wrappedCallback);
            dispatch(actions.deleteRecord({matrxRecordId: recordId, callbackId}));
        });

        return true;
    }, [dispatch, actions]);

    // Convenience methods
    const updateActiveRecord = useCallback(() => {
        if (!activeRecordId) return false;

        const unsavedData = unsavedRecordById(activeRecordId);
        const originalData = effectiveRecordById(activeRecordId);

        if (!unsavedData || !originalData) return false;

        const hasChanges = Object.keys(unsavedData).some(
            key => unsavedData[key] !== originalData[key]
        );

        if (!hasChanges) return false;

        return handleUpdate(activeRecordId);
    }, [activeRecordId, handleUpdate, unsavedRecordById, effectiveRecordById]);

    const deleteActiveRecord = useCallback(() => {
        if (!activeRecordId) return false;
        return handleDelete(activeRecordId);
    }, [activeRecordId, handleDelete]);

    const updateSelectedRecords = useCallback(() => {
        if (selectedRecordIds.length === 0) return false;

        const recordsToUpdate = selectedRecordIds.filter(recordId => {
            const unsavedData = unsavedRecordById(recordId);
            const originalData = effectiveRecordById(recordId);

            if (!unsavedData || !originalData) return false;

            return Object.keys(unsavedData).some(
                key => unsavedData[key] !== originalData[key]
            );
        });

        if (recordsToUpdate.length === 0) return false;

        return handleBatchUpdate(recordsToUpdate);
    }, [selectedRecordIds, handleBatchUpdate, unsavedRecordById, effectiveRecordById]);

    const deleteSelectedRecords = useCallback(() => {
        if (selectedRecordIds.length === 0) return false;
        return handleBatchDelete(selectedRecordIds);
    }, [selectedRecordIds, handleBatchDelete]);

    const effectiveRecordOrDefaults = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) =>
            selectors.selectEffectiveRecordOrDefaults(store.getState(), matrxRecordId);
    }, [selectors, store]);


    const activeRecordCrud = useMemo(() => ({
        updateField: updateFieldForActiveRecord,
        updateRecord: updateActiveRecord,
        deleteRecord: deleteActiveRecord,
        setMode,
        recordId: activeRecordId,
        recordData: activeRecord,
        unsavedData: unsavedRecordById(activeRecordId),
    }), [updateFieldForActiveRecord, updateActiveRecord, deleteActiveRecord, activeRecordId, activeRecord, unsavedRecordById]);

    const selectedRecordsCrud = useMemo(() => ({
        updateRecord: updateSelectedRecords,
        deleteRecord: deleteSelectedRecords,
        recordIds: selectedRecordIds,
        recordData: selectedRecords,
    }), [updateSelectedRecords, deleteSelectedRecords, selectedRecordIds, selectedRecords]);

    const CrudById = useCallback((recordId: MatrxRecordId) => ({
        startUpdateMode,
        updateField: (field: string, value: any) => updateField(recordId, field, value),
        updateRecord: () => handleUpdate(recordId),
        deleteRecord: () => handleDelete(recordId),
    }), [startUpdateMode, updateField, handleUpdate, handleDelete]);

    const batchCrud = useMemo(() => ({
        updateRecord: handleBatchUpdate,
        deleteRecord: handleBatchDelete,
    }), [handleBatchUpdate, handleBatchDelete]);

    const crudHandlers = useMemo(() => ({
        startCreate: startCreateMode,
        startUpdate: startUpdateMode,
        setMode,
        activeRecordCrud,
        selectedRecordsCrud,
        CrudById,
        batchCrud,
        create: handleCreate,
    }), [
        startCreateMode,
        startUpdateMode,
        setMode,
        activeRecordCrud,
        selectedRecordsCrud,
        CrudById,
        batchCrud,
        handleCreate,
    ]);

    // Return same interface
    return {
        startCreateMode,
        startUpdateMode,
        cancelOperation,
        updateField,
        updateFieldForActiveRecord,
        handleCreate,
        handleUpdate,
        handleBatchUpdate,
        handleDelete,
        handleBatchDelete,
        updateActiveRecord,
        deleteActiveRecord,
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

        crud: crudHandlers,
        activeRecordCrud,
        selectedRecordsCrud,
        CrudById,
        batchCrud,

        activeRecordId,
        selectedRecordIds,

    };
};
