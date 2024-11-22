// lib/redux/entity/useEntity.ts
import * as React from 'react';
import {useMemo, useCallback, useState, useEffect} from 'react';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {useAppSelector, useAppDispatch, useAppStore} from '@/lib/redux/hooks';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {
    MatrxRecordId,
    FilterPayload,
    SortPayload,
    EntityState,
    QuickReferenceRecord,
    EntityError, EntityStateField,
} from '@/lib/redux/entity/types';
import {RootState} from '@/lib/redux/store';
import { getEntitySlice } from '@/lib/redux/entity/entitySlice';
import {Draft} from "immer";
import {QueryOptions} from "@/lib/redux/entity/sagaHelpers";
import {createRecordKey} from '@/lib/redux/entity/utils';
import {useEntitySelection} from "@/lib/redux/entity/hooks/useEntitySelection";
import {Callback, callbackManager} from "@/utils/callbackManager";
import {useQuickReference} from "@/lib/redux/entity/hooks/useQuickReference";
import {useEntityValidation} from "@/lib/redux/entity/hooks/useValidation";

import {useActiveRecords} from "@/lib/redux/entity/hooks/useActiveRecords";
import { useEntityToasts } from './hooks/useEntityToasts';

const entityDefaultSettings = {
    maxQuickReferenceRecords: 1000
}

export const useEntity = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const dispatch = useAppDispatch();
    const store = useAppStore();

    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);

    const [lastError, setLastError] = useState<any>(null);

    const selection = useEntitySelection(entityKey);
    const quickReference = useQuickReference(entityKey);
    const validation = useEntityValidation(entityKey);
    const toasts = useEntityToasts(entityKey);

    const activeRecordsAnyEntity = useActiveRecords();  // NOTE: Not Entity specific.

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

    const entityState = (state: RootState) => {
        return state.entities[entityKey];
    }

    const recordByPrimaryKey = useMemo(() => {
        return (primaryKeyValues: Record<string, MatrxRecordId>) =>
            selectors.selectRecordByPrimaryKey(store.getState(), primaryKeyValues);
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


    const fetchRecords = useCallback((page: number, pageSize: number, options?: QueryOptions<TEntity>) => {
        dispatch(actions.fetchRecords({page, pageSize, options}));
    }, [dispatch, actions]);

    const fetchOne = useCallback((primaryKeyValues: Record<string, MatrxRecordId>) => {
        dispatch(actions.fetchOne({primaryKeyValues}));
    }, [dispatch, actions]);

    const fetchAll = React.useCallback((callback?: Callback) => {
        const callbackId = callback ? callbackManager.register(callback) : null;

        dispatch(
            actions.fetchAll({
                callbackId,
            })
        );
    }, [actions, dispatch]);

    const createRecord = React.useCallback((
        data: Partial<EntityData<TEntity>>,
        options?: { callback?: Callback; showToast?: boolean }
    ) => {
        const wrappedCallback = (result: { success: boolean; error?: any }) => {
            if (result.success) {
                toasts.handleCreateSuccess({ showToast: options?.showToast });
            } else {
                toasts.handleError(result.error, 'create', { showToast: options?.showToast });
            }
            options?.callback?.(result);
        };

        const callbackId = callbackManager.register(wrappedCallback);

        dispatch(
            actions.createRecord({
                data,
                callbackId,
            })
        );
    }, [actions, dispatch, toasts]);

    const updateRecord = React.useCallback((
        matrxRecordId: MatrxRecordId,
        data: Partial<EntityData<TEntity>>,
        options?: { callback?: Callback; showToast?: boolean }
    ) => {
        const wrappedCallback = (result: { success: boolean; error?: any }) => {
            if (result.success) {
                toasts.handleUpdateSuccess({ showToast: options?.showToast });
            } else {
                toasts.handleError(result.error, 'update', { showToast: options?.showToast });
            }
            options?.callback?.(result);
        };

        const callbackId = callbackManager.register(wrappedCallback);

        dispatch(
            actions.updateRecord({
                matrxRecordId,
                data,
                callbackId,
            })
        );
    }, [actions, dispatch, toasts]);

    const deleteRecord = React.useCallback((
        matrxRecordId: MatrxRecordId,
        options?: { callback?: Callback; showToast?: boolean }
    ) => {
        const wrappedCallback = (result: { success: boolean; error?: any }) => {
            if (result.success) {
                toasts.handleDeleteSuccess({ showToast: options?.showToast });
            } else {
                toasts.handleError(result.error, 'delete', { showToast: options?.showToast });
            }
            options?.callback?.(result);
        };

        const callbackId = callbackManager.register(wrappedCallback);

        dispatch(
            actions.deleteRecord({
                matrxRecordId,
                callbackId,
            })
        );
    }, [actions, dispatch, toasts]);



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



    // Optimistic Update Support
    const optimisticUpdate = useCallback((
        record: Draft<EntityData<TEntity>>,
        rollback?: Draft<EntityData<TEntity>>
    ) => {
        safeDispatch(actions.optimisticUpdate({record, rollback}));
    }, [safeDispatch, actions]);

    // Enhanced Error Handling
    const handleError = useCallback((error: any) => {
        setLastError(error);
        safeDispatch(actions.setError({
            message: error.message || 'An unknown error occurred',
            code: error.code,
            details: error
        }));
    }, [safeDispatch, actions]);


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

        // Selection
        // Selection Management (from useEntitySelection)
        selectedRecordIds: selection.selectedRecordIds,
        activeRecordId: selection.activeRecordId,
        selectedRecords: selection.selectedRecords,
        activeRecord: selection.activeRecord,
        selectionMode: selection.selectionMode,
        summary: selection.summary,

        // Selection Utilities
        isSelected: selection.isSelected,
        isActive: selection.isActive,
        toggleSelectionMode: selection.toggleSelectionMode,
        clearSelection: selection.clearSelection,
        handleSingleSelection: selection.handleSingleSelection,

        addToSelection: selection.handleSelection,

        // All Active Records, Quick Reference, Validation hooks extended
        quickReference,
        validation,
        activeRecordsAnyEntity,




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
    };
};
