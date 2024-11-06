// lib/redux/entity/useEntity.ts

import {useMemo, useCallback, useState, useEffect} from 'react';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {useAppSelector, useAppDispatch} from '@/lib/redux/hooks';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {MatrxRecordId, FilterPayload, SortPayload} from '@/lib/redux/entity/types';
import {RootState} from '@/lib/redux/store';
import {createEntitySlice} from '@/lib/redux/entity/slice';
import {Draft} from "immer";
import {QueryOptions} from "@/lib/redux/entity/sagas";
import { createRecordKey } from '@/lib/redux/entity//utils';

export const useEntity = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const dispatch = useAppDispatch();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { actions } = useMemo(() => createEntitySlice(entityKey, {} as any), [entityKey]);
    const [lastError, setLastError] = useState<any>(null);

    const safeDispatch = useCallback((action: any) => {
        try {
            dispatch(action);
        } catch (error) {
            console.error(`Error dispatching action for ${entityKey}:`, error);
            setLastError(error);
        }
    }, [dispatch, entityKey]);

    // Enhanced Selectors
    const allRecords = useAppSelector(selectors.selectAllRecords);
    const entityDisplayName = useAppSelector(selectors.selectEntityDisplayName);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const fieldOptions = useAppSelector(selectors.selectFieldOptions);
    const tableColumns = useAppSelector(selectors.selectTableColumns);
    const selectionSummary = useAppSelector(selectors.selectSelectionSummary);
    const metadataSummary = useAppSelector(selectors.selectMetadataSummary);
    const dataState = useAppSelector(selectors.selectDataState);
    const paginationExtended = useAppSelector(selectors.selectPaginationExtended);
    const historyState = useAppSelector(selectors.selectHistoryState);
    const currentPageFiltered = useAppSelector(selectors.selectCurrentPageFiltered);

    // Existing selector functions
    const recordByPrimaryKey = (primaryKeyValues: Record<string, MatrxRecordId>) => {
        const selector = useMemo(
            () => (state: RootState) => selectors.selectRecordByPrimaryKey(state, primaryKeyValues),
            [primaryKeyValues]
        );
        return useAppSelector(selector);
    };

    // New record with display values selector
    const recordWithDisplay = (recordKey: string) => {
        const selector = useMemo(
            () => (state: RootState) => selectors.selectRecordWithDisplay(state, recordKey),
            [recordKey]
        );
        return useAppSelector(selector);
    };

    const recordsByPrimaryKeys = (primaryKeyValuesList: Record<string, MatrxRecordId>[]) => {
        const selector = useMemo(
            () => (state: RootState) => selectors.selectRecordsByPrimaryKeys(state, primaryKeyValuesList),
            [primaryKeyValuesList]
        );
        return useAppSelector(selector);
    };

    const quickReference = useAppSelector(selectors.selectQuickReference);

    const quickReferenceByPrimaryKey = (primaryKeyValues: Record<string, MatrxRecordId>) => {
        const selector = useMemo(
            () => (state: RootState) => selectors.selectQuickReferenceByPrimaryKey(state, primaryKeyValues),
            [primaryKeyValues]
        );
        return useAppSelector(selector);
    };

    // Core state selectors
    const selectedRecords = useAppSelector(selectors.selectSelectedRecords);
    const activeRecord = useAppSelector(selectors.selectActiveRecord);
    const selectionMode = useAppSelector(selectors.selectSelectionMode);
    const paginationInfo = useAppSelector(selectors.selectPaginationInfo);
    const currentPage = useAppSelector(selectors.selectCurrentPage);
    const currentFilters = useAppSelector(selectors.selectCurrentFilters);
    const filteredRecords = useAppSelector(selectors.selectFilteredRecords);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const error = useAppSelector(selectors.selectError);
    const isStale = useAppSelector(selectors.selectIsStale);
    const hasUnsavedChanges = useAppSelector(selectors.selectHasUnsavedChanges);
    const entityMetadata = useAppSelector(selectors.selectEntityMetadata);
    const primaryKeyMetadata = useAppSelector(selectors.selectPrimaryKeyMetadata);
    const displayField = useAppSelector(selectors.selectDisplayField);
    const history = useAppSelector(selectors.selectHistory);

    useEffect(() => {
        console.log(`Entity Hook Initialized for: ${entityKey}`);
    }, [entityKey]);

    const fetchRecords = useCallback((page: number, pageSize: number, options?: QueryOptions<TEntity>) => {
        dispatch(actions.fetchRecords({page, pageSize, options}));
    }, [dispatch, actions]);

    // Add selectors with debug logging
    const entityState = useAppSelector((state) => {
        console.log('Full Redux State:', state);
        return state.entities[entityKey];
    });

    console.log(`Entity State for ${entityKey}:`, entityState);


    const fetchOne = useCallback((primaryKeyValues: Record<string, MatrxRecordId>) => {
        dispatch(actions.fetchOne({primaryKeyValues}));
    }, [dispatch, actions]);

    const fetchAll = useCallback(() => {
        dispatch(actions.fetchAll());
    }, [dispatch, actions]);


    const createRecord = useCallback((data: EntityData<TEntity>) => {
        dispatch(actions.createRecord(data));
    }, [dispatch, actions]);

    const updateRecord = useCallback((
        primaryKeyValues: Record<string, MatrxRecordId>,
        data: Partial<EntityData<TEntity>>
    ) => {
        dispatch(actions.updateRecord({primaryKeyValues, data}));
    }, [dispatch, actions]);

    const deleteRecord = useCallback((primaryKeyValues: Record<string, MatrxRecordId>) => {
        dispatch(actions.deleteRecord({primaryKeyValues}));
    }, [dispatch, actions]);

    const setSelection = useCallback((records: Draft<EntityData<TEntity>>[], mode: 'single' | 'multiple' | 'none') => {
        dispatch(actions.setSelection({records, mode}));
    }, [dispatch, actions]);

    const clearSelection = useCallback(() => {
        dispatch(actions.clearSelection());
    }, [dispatch, actions]);

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

    const addToSelection = useCallback((record: Draft<EntityData<TEntity>>) => {
        safeDispatch(actions.addToSelection(record));
    }, [safeDispatch, actions]);

    const removeFromSelection = useCallback((record: Draft<EntityData<TEntity>>) => {
        safeDispatch(actions.removeFromSelection(record));
    }, [safeDispatch, actions]);

    const toggleSelection = useCallback((record: Draft<EntityData<TEntity>>) => {
        safeDispatch(actions.toggleSelection(record));
    }, [safeDispatch, actions]);

    const batchSelection = useCallback((
        operation: 'add' | 'remove' | 'toggle',
        records: Draft<EntityData<TEntity>>[]
    ) => {
        safeDispatch(actions.batchSelection({ operation, records }));
    }, [safeDispatch, actions]);

    // Optimistic Update Support
    const optimisticUpdate = useCallback((
        record: Draft<EntityData<TEntity>>,
        rollback?: Draft<EntityData<TEntity>>
    ) => {
        safeDispatch(actions.optimisticUpdate({ record, rollback }));
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

    // Selection Helpers
    const isSelected = useCallback((record: EntityData<TEntity>) => {
        return selectedRecords.some(selected =>
            createRecordKey(primaryKeyMetadata, selected) ===
            createRecordKey(primaryKeyMetadata, record)
        );
    }, [selectedRecords, primaryKeyMetadata]);

    return {
        // Entity Basics
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
        quickReference,
        quickReferenceByPrimaryKey,

        // Selection
        selectedRecords,
        activeRecord,
        selectionMode,
        selectionSummary,
        isSelected,

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
        addToSelection,
        removeFromSelection,
        toggleSelection,
        batchSelection,
        optimisticUpdate,


        // Actions
        fetchRecords,
        fetchOne,
        fetchAll,
        createRecord,
        updateRecord,
        deleteRecord,
        setSelection,
        clearSelection,
        setFilters,
        setSorting,
        clearFilters,
        refreshData,
        invalidateCache,

        // Error Handling
        lastError,
        clearError: () => setLastError(null),
        handleError,
    };
};
