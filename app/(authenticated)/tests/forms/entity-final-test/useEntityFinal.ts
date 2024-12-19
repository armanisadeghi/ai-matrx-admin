// lib/redux/entity/useEntity.ts
import * as React from 'react';
import {useMemo, useCallback, useState} from 'react';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {useAppSelector, useAppDispatch, useAppStore} from '@/lib/redux/hooks';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {MatrxRecordId, FilterPayload, SortPayload, FlexibleQueryOptions} from '@/lib/redux/entity/types/stateTypes';
import {RootState} from '@/lib/redux/store';
import {getEntitySlice} from '@/lib/redux/entity/entitySlice';
import {Draft} from "immer";
import {Callback, callbackManager} from "@/utils/callbackManager";
import {useQuickRef} from './useQuickRef';
import {FetchRecordsPayload, useEntityToasts} from '@/lib/redux';
import {entityDefaultSettings} from "@/lib/redux/entity/constants/defaults";

export const useEntityFinal = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const dispatch = useAppDispatch();
    const store = useAppStore();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const [lastError, setLastError] = useState<any>(null);

    const quickReference = useQuickRef(entityKey);
    const toasts = useEntityToasts(entityKey);

    const safeDispatch = useCallback((action: any) => {
        try {
            dispatch(action);
        } catch (error) {
            console.error(`Error dispatching action for ${entityKey}:`, error);
            setLastError(error);
        }
    }, [dispatch, entityKey]);

    const allRecords = useAppSelector(selectors.selectAllRecords);
    const entityDisplayName = useAppSelector(selectors.selectEntityDisplayName);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const fieldOptions = useAppSelector(selectors.selectFieldOptions);
    const tableColumns = useAppSelector(selectors.selectTableColumns);
    const metadataSummary = useAppSelector(selectors.selectMetadataSummary);
    const dataState = useAppSelector(selectors.selectDataState);
    const paginationExtended = useAppSelector(selectors.selectPaginationExtended);
    const historyState = useAppSelector(selectors.selectHistoryState);
    const currentPageFiltered = useAppSelector(selectors.selectCurrentPageFiltered);
    const paginationInfo = useAppSelector(selectors.selectPaginationInfo);
    const currentPage = useAppSelector(selectors.selectCurrentPage);
    const currentPageWithRecordId = useAppSelector(selectors.selectCurrentPageWithRecordId);
    const currentFilters = useAppSelector(selectors.selectCurrentFilters);
    const filteredRecords = useAppSelector(selectors.selectFilteredRecords);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const error = useAppSelector(selectors.selectErrorState);
    const isStale = useAppSelector(selectors.selectIsStale);
    const hasUnsavedChanges = useAppSelector(selectors.selectHasUnsavedChanges);
    const entityMetadata = useAppSelector(selectors.selectEntityMetadata);
    const primaryKeyMetadata = useAppSelector(selectors.selectPrimaryKeyMetadata);
    const displayField = useAppSelector(selectors.selectDisplayField);
    const history = useAppSelector(selectors.selectHistory);
    const selectedRecordsWithKey = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const operationMode = useAppSelector(selectors.selectOperationMode);
    const recordWithDefaultValues = useAppSelector(selectors.selectDefaultValues);

    const entityState = (state: RootState) => {
        return state.entities[entityKey];
    }

    const effectiveRecordById = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) =>
            selectors.selectEffectiveRecordById(store.getState(), matrxRecordId);
    }, [selectors, store]);

    const effectiveRecordOrDefaults = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) =>
            selectors.selectEffectiveRecordOrDefaults(store.getState(), matrxRecordId);
    }, [selectors, store]);


    const recordByPrimaryKey = useMemo(() => {
        return (primaryKeyValues: Record<string, MatrxRecordId>) =>
            selectors.selectRecordByPrimaryKey(store.getState(), primaryKeyValues);
    }, [selectors, store]);

    const unsavedRecordById = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) =>
            selectors.selectUnsavedRecordById(store.getState(), matrxRecordId);
    }, [selectors, store]);


    const isTemporaryRecordId = useMemo(() => {
        return (matrxRecordId: MatrxRecordId) =>
            selectors.selectIsTemporaryRecordId(store.getState(), matrxRecordId);
    }, [selectors, store]);

    const recordsByPrimaryKeys = useMemo(() => {
        return (primaryKeyValuesList: Record<string, MatrxRecordId>[]) =>
            selectors.selectRecordsByPrimaryKeys(store.getState(), primaryKeyValuesList);
    }, [selectors, store]);

    const matrxRecordIdByPrimaryKey = useMemo(() => {
        return (primaryKeyValues: Record<string, MatrxRecordId>) =>
            selectors.selectMatrxRecordIdByPrimaryKey(store.getState(), primaryKeyValues);
    }, [selectors, store]);

    const matrxRecordIdsByPrimaryKeys = useMemo(() => {
        return (primaryKeyValuesList: Record<string, MatrxRecordId>[]) =>
            selectors.selectMatrxRecordIdsByPrimaryKeys(store.getState(), primaryKeyValuesList);
    }, [selectors, store]);

    const quickReferenceByPrimaryKey = useMemo(() => {
        return (primaryKeyValues: Record<string, MatrxRecordId>) =>
            selectors.selectQuickReferenceByPrimaryKey(store.getState(), primaryKeyValues);
    }, [selectors, store]);

    const recordWithDisplay = useMemo(() => {
        return (recordKey: string) =>
            selectors.selectRecordWithDisplay(store.getState(), recordKey);
    }, [selectors, store]);


    const fetchQuickReference = useCallback((): void => {
        dispatch(actions.fetchQuickReference({maxRecords: entityDefaultSettings.maxQuickReferenceRecords}));
    }, [dispatch, actions]);

    const setPage = useCallback((page: number) => {
        dispatch(actions.setPage(page));
    }, [dispatch, actions]);

    const setPageSize = useCallback((pageSize: number) => {
        dispatch(actions.setPageSize(pageSize));
    }, [dispatch, actions]);

    const fetchRecords = useCallback(
        (page: number, pageSize: number, options?: FetchRecordsPayload['options']) => {
            dispatch(actions.fetchRecords({page, pageSize, options}));
        },
        [dispatch, actions]
    );

    const fetchOne = useCallback((matrxRecordId: MatrxRecordId, callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;
        dispatch(actions.fetchOne({matrxRecordId, callbackId,}));
    }, [dispatch, actions]);

    const fetchOneWithFkIfk = useCallback((matrxRecordId: MatrxRecordId, callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;
        dispatch(actions.fetchOneWithFkIfk({matrxRecordId, callbackId,}));
    }, [dispatch, actions]);

    const fetchAll = React.useCallback((callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;
        dispatch(actions.fetchAll({callbackId,}));
    }, [actions, dispatch]);

    const createRecord = useCallback((createPayloadArray: FlexibleQueryOptions[], callback?: Callback) => {
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


    const updateRecord = React.useCallback((matrxRecordId: MatrxRecordId, callback?: Callback) => {
        const wrappedCallback = (result: { success: boolean; error?: any }) => {
            callback?.(result);
        };
        const callbackId = callbackManager.register(wrappedCallback);
        dispatch(actions.updateRecord({matrxRecordId, callbackId,}));
    }, [actions, dispatch]);

    const deleteRecord = React.useCallback((matrxRecordId: MatrxRecordId, callback?: Callback) => {
        const wrappedCallback = (result: { success: boolean; error?: any }) => {
            callback?.(result);
        };
        const callbackId = callbackManager.register(wrappedCallback);
        dispatch(actions.deleteRecord({matrxRecordId, callbackId,}));
    }, [actions, dispatch]);


    const setFilters = useCallback((payload: FilterPayload) => {
        dispatch(actions.setFilters(payload));
    }, [dispatch, actions]);

    const setSorting = useCallback((payload: SortPayload) => {
        dispatch(actions.setSorting(payload));
    }, [dispatch, actions]);

    const clearFilters = useCallback(() => {
        dispatch(actions.clearFilters());
    }, [dispatch, actions]);

    const refreshData = useCallback(() => {
        dispatch(actions.refreshData());
    }, [dispatch, actions]);

    const invalidateCache = useCallback(() => {
        dispatch(actions.invalidateCache());
    }, [dispatch, actions]);

    const optimisticUpdate = useCallback((
        record: Draft<EntityData<TEntity>>,
        rollback?: Draft<EntityData<TEntity>>
    ) => {
        safeDispatch(actions.optimisticUpdate({record, rollback}));
    }, [safeDispatch, actions]);

    const handleError = useCallback((error: any) => {
        setLastError(error);
        safeDispatch(actions.setError({
            message: error.message || 'An unknown error occurred',
            code: error.code,
            details: error
        }));
    }, [safeDispatch, actions]);

    const setSelection = React.useCallback((records: any[], mode: 'single') => {
        console.log('setSelection not yet implemented');
    }, []);


    return {
        entityDisplayName,


        // Core Data
        allRecords,
        recordByPrimaryKey,
        recordsByPrimaryKeys,
        recordWithDisplay,

        // Enhanced Field Information
        fieldInfo,
        fieldOptions,
        tableColumns,

        // Quick Reference
        quickReferenceByPrimaryKey,

        // Selection Management (from useEntitySelection)
        selectedRecordIds: quickReference.selectedRecordIds,
        activeRecordId: quickReference.activeRecordId,
        selectedRecords: quickReference.selectedRecords,
        activeRecord: quickReference.activeRecord,
        selectionMode: quickReference.selectionMode,
        summary: quickReference.summary,

        // Selection Utilities
        isSelected: quickReference.isSelected,
        isActive: quickReference.isActive,
        toggleSelectionMode: quickReference.toggleSelectionMode,
        clearSelection: quickReference.clearSelection,
        handleSingleSelection: quickReference.handleSingleSelection,
        handleToggleSelection: quickReference.handleToggleSelection,
        addToSelection: quickReference.handleAddToSelection,
        fetchMode: quickReference.fetchMode,
        setFetchMode: quickReference.setFetchMode,


        quickReference,
        // Pagination
        paginationInfo,
        paginationExtended,
        currentPage,
        currentPageFiltered,

        // Enhanced State
        dataState,
        metadataSummary,
        historyState,

        // Existing returns...
        currentFilters,
        filteredRecords,

        // State
        loadingState,
        error,
        isStale,
        hasUnsavedChanges,

        // Metadata
        entityMetadata,
        primaryKeyMetadata,
        displayField,

        // History
        history,

        // Enhanced Actions
        optimisticUpdate,


        // Pagination
        setPage,
        setPageSize,


        // Actions
        fetchRecords,
        fetchOne,
        fetchAll,
        fetchQuickReference,
        createRecord,
        updateRecord,
        deleteRecord,

        setFilters,
        setSorting,
        clearFilters,
        refreshData,
        invalidateCache,

        // Error Handling
        lastError,
        clearError: () => setLastError(null),
        handleError,

        matrxRecordIdByPrimaryKey,
        matrxRecordIdsByPrimaryKeys,
        entityState,

        selectedRecordsWithKey,
        currentPageWithRecordId,

        fetchOneWithFkIfk,

        operationMode,
        unsavedRecordById,
        effectiveRecordById,
        isTemporaryRecordId,

        setSelection, // TODO: This is fake and temporary just to avoid errors.

        effectiveRecordOrDefaults,
        recordWithDefaultValues,
        toasts,
    };
};
