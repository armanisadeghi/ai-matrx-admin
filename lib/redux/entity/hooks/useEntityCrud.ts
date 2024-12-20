// lib/redux/entity/useEntity.ts
'use client';


import * as React from 'react';
import {useCallback, useMemo} from 'react';
import {useAppDispatch, useAppSelector, useAppStore} from '@/lib/redux/hooks';
import {EntityKeys} from '@/types/entityTypes';
import {EntityOperationMode, FlexibleQueryOptions, MatrxRecordId,} from '@/lib/redux/entity/types/stateTypes';
import {getEntitySlice} from '@/lib/redux/entity/entitySlice';
import {Callback, callbackManager} from "@/utils/callbackManager";
import {useEntityValidation} from "@/lib/redux/entity/hooks/useEntityValidation";
import {useEntity} from "@/lib/redux/entity/hooks/useEntity";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {UpdateRecordPayload} from '../actions';

export const useEntityCrud = <TEntity extends EntityKeys>(entityKey: TEntity) => {

    console.log(' === useEntitySelection ===')


    const dispatch = useAppDispatch();
    const store = useAppStore();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const validation = useEntityValidation(entityKey);
    const entity = useEntity(entityKey);

    const pendingOperations = useAppSelector(selectors.selectPendingOperations);
    const flags = useAppSelector(selectors.selectEntityFlags);
    const dataState = useAppSelector(selectors.selectDataState);

    const isOperationPending = useCallback((matrxRecordId: MatrxRecordId) =>
            pendingOperations.includes(matrxRecordId)
        , [pendingOperations]);

    const hasSelectedRecordsPending = useMemo(() =>
            entity.selectedRecordIds.some(matrxRecordId => pendingOperations.includes(matrxRecordId))
        , [entity.selectedRecordIds, pendingOperations]);

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
        if (entity.activeRecordId || entity.selectedRecordIds.length > 0) {
            dispatch(actions.startRecordUpdate());
        }
    }, [dispatch, actions, entity]);

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
            recordId: entity.activeRecordId,
            field,
            value
        }));
    }, [dispatch, actions, entity.activeRecordId]);


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
    }, [entity, dispatch, actions]);

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
        const targetRecords = recordIds || entity.selectedRecordIds;
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
    }, [entity, dispatch, actions]);


    const handleDelete = useCallback((recordId: MatrxRecordId, callback?: Callback) => {
        dispatch(actions.addPendingOperation(recordId));
        const wrappedCallback = (result: { success: boolean; error?: any }) => {
            dispatch(actions.removePendingOperation(recordId));
            if (callback) {
                callback(result);
            }
        };
        entity.deleteRecord(recordId, wrappedCallback);
    }, [dispatch, actions, entity]);


    const handleBatchDelete = useCallback((recordIds?: MatrxRecordId[], callback?: Callback) => {
        const targetRecords = recordIds || entity.selectedRecordIds;
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
    }, [entity, dispatch, actions]);

    // Convenience methods
    const updateActiveRecord = useCallback(() => {
        if (!entity.activeRecordId) return false;

        const unsavedData = unsavedRecordById(entity.activeRecordId);
        const originalData = effectiveRecordById(entity.activeRecordId);

        if (!unsavedData || !originalData) return false;

        const hasChanges = Object.keys(unsavedData).some(
            key => unsavedData[key] !== originalData[key]
        );

        if (!hasChanges) return false;

        return handleUpdate(entity.activeRecordId);
    }, [entity.activeRecordId, handleUpdate, unsavedRecordById, effectiveRecordById]);

    const deleteActiveRecord = useCallback(() => {
        if (!entity.activeRecordId) return false;
        return handleDelete(entity.activeRecordId);
    }, [entity.activeRecordId, handleDelete]);

    const updateSelectedRecords = useCallback(() => {
        if (entity.selectedRecordIds.length === 0) return false;

        const recordsToUpdate = entity.selectedRecordIds.filter(recordId => {
            const unsavedData = unsavedRecordById(recordId);
            const originalData = effectiveRecordById(recordId);

            if (!unsavedData || !originalData) return false;

            return Object.keys(unsavedData).some(
                key => unsavedData[key] !== originalData[key]
            );
        });

        if (recordsToUpdate.length === 0) return false;

        return handleBatchUpdate(recordsToUpdate);
    }, [entity.selectedRecordIds, handleBatchUpdate, unsavedRecordById, effectiveRecordById]);

    const deleteSelectedRecords = useCallback(() => {
        if (entity.selectedRecordIds.length === 0) return false;
        return handleBatchDelete(entity.selectedRecordIds);
    }, [entity.selectedRecordIds, handleBatchDelete]);


    const activeRecordCrud = useMemo(() => ({
        updateField: updateFieldForActiveRecord,
        updateRecord: updateActiveRecord,
        deleteRecord: deleteActiveRecord,
        setMode,
        recordId: entity.activeRecordId,
        recordData: entity.activeRecord,
        unsavedData: unsavedRecordById(entity.activeRecordId),
    }), [updateFieldForActiveRecord, updateActiveRecord, deleteActiveRecord, entity.activeRecordId, entity.activeRecord, unsavedRecordById]);

    const selectedRecordsCrud = useMemo(() => ({
        updateRecord: updateSelectedRecords,
        deleteRecord: deleteSelectedRecords,
        recordIds: entity.selectedRecordIds,
        recordData: entity.selectedRecords,
    }), [updateSelectedRecords, deleteSelectedRecords, entity.selectedRecordIds, entity.selectedRecords]);

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
        hasUnsavedChanges: entity.hasUnsavedChanges,
        operationMode: entity.operationMode,


        validation,
        selection: entity,
        getUnsavedRecord: entity.unsavedRecordById,
        getEffectiveRecord: entity.effectiveRecordById,
        getEffectiveRecordOrDefaults: entity.effectiveRecordOrDefaults,
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

        activeRecordId: entity.activeRecordId,
        selectedRecordIds: entity.selectedRecordIds,

    };
};
