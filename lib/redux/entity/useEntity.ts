// lib/redux/entity/useEntity.ts

import {useMemo, useCallback, useState, useEffect} from 'react';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { MatrxRecordId, FilterPayload, SortPayload } from '@/lib/redux/entity/types';
import { RootState } from '@/lib/redux/store';
import { createEntitySlice } from './slice';
import {Draft} from "immer";
import {QueryOptions} from "@/lib/redux/entity/sagas";

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




    // Memoized selectors
    const allRecords = useAppSelector(selectors.selectAllRecords);

    const recordByPrimaryKey = (primaryKeyValues: Record<string, MatrxRecordId>) => {
        const selector = useMemo(
            () => (state: RootState) => selectors.selectRecordByPrimaryKey(state, primaryKeyValues),
            [primaryKeyValues]
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
        dispatch(actions.fetchRecords({ page, pageSize, options }));
    }, [dispatch, actions]);

    // Add selectors with debug logging
    const entityState = useAppSelector((state) => {
        console.log('Full Redux State:', state);
        return state.entities[entityKey];
    });

    console.log(`Entity State for ${entityKey}:`, entityState);


    const fetchOne = useCallback((primaryKeyValues: Record<string, MatrxRecordId>) => {
        dispatch(actions.fetchOne({ primaryKeyValues }));
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
        dispatch(actions.updateRecord({ primaryKeyValues, data }));
    }, [dispatch, actions]);

    const deleteRecord = useCallback((primaryKeyValues: Record<string, MatrxRecordId>) => {
        dispatch(actions.deleteRecord({ primaryKeyValues }));
    }, [dispatch, actions]);

    const setSelection = useCallback((records: Draft<EntityData<TEntity>>[], mode: 'single' | 'multiple' | 'none') => {
        dispatch(actions.setSelection({ records, mode }));
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

    return {
        // Core Data
        allRecords,
        recordByPrimaryKey,
        recordsByPrimaryKeys,

        // Quick Reference
        quickReference,
        quickReferenceByPrimaryKey,

        // Selection
        selectedRecords,
        activeRecord,
        selectionMode,

        // Pagination
        paginationInfo,
        currentPage,

        // Filters
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

        lastError,
        clearError: () => setLastError(null),

    };
};
