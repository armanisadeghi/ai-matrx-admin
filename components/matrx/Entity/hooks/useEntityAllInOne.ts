// lib/redux/entity/useEntity.ts

import {useMemo, useCallback, useState, useEffect} from 'react';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {useAppSelector, useAppDispatch} from '@/lib/redux/hooks';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {
    MatrxRecordId,
    FilterPayload,
    SortPayload,
    EntityState,
    QuickReferenceRecord,
    EntityError
} from '@/lib/redux/entity/types/stateTypes';
import {RootState} from '@/lib/redux/store';
import { getEntitySlice } from '@/lib/redux/entity/entitySlice';

import {Draft} from "immer";
import {QueryOptions} from "@/lib/redux/entity/sagas/sagaHelpers";
import {createRecordKey} from '@/lib/redux/entity/utils/stateHelpUtils';
import {
    ColumnDef,
    SortingState,
    VisibilityState,
    PaginationState,
    RowSelectionState,
    TableOptions,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
} from "@tanstack/react-table"

interface TanStackTableState {
    sorting: SortingState
    columnVisibility: VisibilityState
    rowSelection: RowSelectionState
    pagination: PaginationState
    globalFilter: string
}

interface TanStackColumnMeta {
    isPrimaryKey: boolean
    isDisplayField: boolean
    fieldType: string
    sortable?: boolean
    filterable?: boolean
    width?: number
    align?: 'left' | 'center' | 'right'
}

export interface EntityHookReturn<TEntity extends EntityKeys> {
    // State
    allRecords: Record<string, EntityData<TEntity>>;
    entityMetadata: EntityState<TEntity>['entityMetadata'];
    entityDisplayName: string;
    fieldInfo: any[];
    fieldOptions: Record<string, any>;
    tableColumns: any[];
    selectedRecords: EntityData<TEntity>[];
    activeRecord: EntityData<TEntity> | null;
    selectionMode: 'single' | 'multiple' | 'none';
    primaryKeyMetadata: EntityState<TEntity>['entityMetadata']['primaryKeyMetadata'];
    displayField: string | null;
    quickReference: QuickReferenceRecord[];
    lastError: EntityError | null;

    // Loading and Status
    loadingState: { loading: boolean; initialized: boolean; error: EntityError | null };
    isStale: boolean;
    hasUnsavedChanges: boolean;

    // Record Access Methods
    getRecordByPrimaryKey: (primaryKeyValues: Record<string, MatrxRecordId>) => EntityData<TEntity> | null;
    getRecordsByPrimaryKeys: (primaryKeyValuesList: Record<string, MatrxRecordId>[]) => EntityData<TEntity>[];
    getQuickReferenceByPrimaryKey: (primaryKeyValues: Record<string, MatrxRecordId>) => QuickReferenceRecord | null;

    // Actions
    fetchOne: (primaryKeyValues: Record<string, MatrxRecordId>) => Promise<void>;
    fetchAll: () => Promise<void>;
    fetchQuickReference: () => Promise<void>;
    fetchRecords: (page: number, pageSize: number, options?: QueryOptions<TEntity>) => Promise<void>;
    createRecord: (data: EntityData<TEntity>) => Promise<void>;
    updateRecord: (primaryKeyValues: Record<string, MatrxRecordId>, data: Partial<EntityData<TEntity>>) => Promise<void>;
    deleteRecord: (primaryKeyValues: Record<string, MatrxRecordId>) => Promise<void>;

    // Selection Methods
    setSelection: (records: Draft<EntityData<TEntity>>[], mode: 'single' | 'multiple' | 'none') => void;
    clearSelection: () => void;
    addToSelection: (recordId: MatrxRecordId) => void;
    removeFromSelection: (record: Draft<EntityData<TEntity>>) => void;
    toggleSelection: (record: Draft<EntityData<TEntity>>) => void;
    batchSelection: (operation: 'add' | 'remove' | 'toggle', records: Draft<EntityData<TEntity>>[]) => void;
    isSelected: (record: EntityData<TEntity>) => boolean;

    // Pagination and Filtering
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    setFilters: (payload: FilterPayload) => void;
    setSorting: (payload: SortPayload) => void;
    clearFilters: () => void;

    // Cache Management
    refreshData: () => void;
    invalidateCache: () => void;

    // Update Helpers
    optimisticUpdate: (record: Draft<EntityData<TEntity>>, rollback?: Draft<EntityData<TEntity>>) => void;
}

const MAX_QUICK_REFERENCE_RECORDS = 1000;

export const useEntity = <TEntity extends EntityKeys>(entityKey: TEntity) => {
    const dispatch = useAppDispatch();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
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

    // Existing selector functions
    const recordByPrimaryKey = (primaryKeyValues: Record<string, MatrxRecordId>) => {
        const selector = useMemo(
            () => (state: RootState) => selectors.selectRecordByPrimaryKey(state, primaryKeyValues),
            [primaryKeyValues]
        );
        return useAppSelector(selector);
    };

    // New record with display values selector
    const getRecordByPrimaryKey = useCallback((primaryKeyValues: Record<string, MatrxRecordId>) => {
        if (!entityMetadata?.primaryKeyMetadata) return null;
        const recordKey = createRecordKey(entityMetadata.primaryKeyMetadata, primaryKeyValues);
        return allRecords[recordKey];
    }, [allRecords, entityMetadata?.primaryKeyMetadata]);


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

    const recordWithDisplay = (recordKey: string) => {
        const selector = useMemo(
            () => (state: RootState) => selectors.selectRecordWithDisplay(state, recordKey),
            [recordKey]
        );
        return useAppSelector(selector);
    };

    useEffect(() => {
        console.log(`Entity Hook Initialized for: ${entityKey}`);
    }, [entityKey]);

    const fetchRecords = useCallback((page: number, pageSize: number, options?: QueryOptions<TEntity>) => {
        dispatch(actions.fetchRecords({page, pageSize, options}));
    }, [dispatch, actions]);

    const entityState = useAppSelector((state) => {
        return state.entities[entityKey];
    });

    const fetchOne = useCallback((primaryKeyValues: Record<string, MatrxRecordId>) => {
        dispatch(actions.fetchOne({primaryKeyValues}));
    }, [dispatch, actions]);

    const fetchAll = useCallback(() => {
        dispatch(actions.fetchAll());
    }, [dispatch, actions]);

    const fetchQuickReference = useCallback(() => {
        dispatch(actions.fetchQuickReference({ maxRecords: MAX_QUICK_REFERENCE_RECORDS }));
    }, [dispatch, actions]);

    const setPage = useCallback((page: number) => {
        dispatch(actions.setPage(page));
    }, [dispatch, actions]);

    const setPageSize = useCallback((pageSize: number) => {
        dispatch(actions.setPageSize(pageSize));
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

    const addToSelection = useCallback((recordId: MatrxRecordId) => {
        safeDispatch(actions.addToSelection(recordId));
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
        safeDispatch(actions.batchSelection({operation, records}));
    }, [safeDispatch, actions]);

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

    // Selection Helpers
    const isSelected = useCallback((record: EntityData<TEntity>) => {
        return selectedRecords.some(selected =>
            createRecordKey(primaryKeyMetadata, selected) ===
            createRecordKey(primaryKeyMetadata, record)
        );
    }, [selectedRecords, primaryKeyMetadata]);


    const [tableState, setTableState] = useState<TanStackTableState>({
        sorting: [],
        columnVisibility: {},
        rowSelection: {},
        pagination: {
            pageIndex: 0,
            pageSize: 10,
        },
        globalFilter: '',
    });

    const tanstackColumns = useMemo(() => {
        if (!tableColumns) return [];

        return tableColumns.map(col => ({
            id: col.key,
            accessorKey: col.key,
            header: col.title,
            cell: ({getValue}) => {
                const value = getValue();
                return value === undefined ? "" : String(value);
            },
            enableSorting: !col.isPrimaryKey,
            enableHiding: !col.isPrimaryKey && !col.isDisplayField,
            meta: {
                isPrimaryKey: col.isPrimaryKey,
                isDisplayField: col.isDisplayField,
                fieldType: fieldInfo[col.key]?.type || 'string',
                sortable: !col.isPrimaryKey,
                filterable: !col.isPrimaryKey,
                align: fieldInfo[col.key]?.align || 'left',
            } as TanStackColumnMeta
        } as ColumnDef<EntityData<TEntity>>));
    }, [tableColumns, fieldInfo]);

    // TanStack core configuration
    const tanstackConfig = useMemo(() => ({
        data: currentPage,
        columns: tanstackColumns,
        pageCount: paginationInfo.totalPages,
        state: {
            ...tableState,
            pagination: {
                pageIndex: Math.max(0, paginationInfo.page - 1),
                pageSize: paginationInfo.pageSize,
            },
        },
        enableRowSelection: true,
        enableMultiRowSelection: true,
        enableSorting: true,
        enableColumnVisibility: true,
        manualPagination: true,
        manualSorting: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getRowId: (row: EntityData<TEntity>) => createRecordKey(primaryKeyMetadata, row),
        onPaginationChange: (updater: any) => {
            const newPagination = typeof updater === 'function'
                                  ? updater(tableState.pagination)
                                  : updater;
            setTableState(prev => ({...prev, pagination: newPagination}));
            fetchRecords(newPagination.pageIndex + 1, newPagination.pageSize);
        },
        onSortingChange: (updater: any) => {
            const newSorting = typeof updater === 'function'
                               ? updater(tableState.sorting)
                               : updater;
            setTableState(prev => ({...prev, sorting: newSorting}));
            setSorting({
                field: newSorting[0]?.id || '',
                direction: newSorting[0]?.desc ? 'desc' : 'asc'
            });
        },
        onColumnVisibilityChange: (updater: any) => {
            const newVisibility = typeof updater === 'function'
                                  ? updater(tableState.columnVisibility)
                                  : updater;
            setTableState(prev => ({...prev, columnVisibility: newVisibility}));
        },
        onRowSelectionChange: (updater: any) => {
            const newSelection = typeof updater === 'function'
                                 ? updater(tableState.rowSelection)
                                 : updater;
            setTableState(prev => ({...prev, rowSelection: newSelection}));
            const selectedRows = currentPage
                .filter((_, index) => newSelection[index]) as Draft<EntityData<TEntity>>[];
            setSelection(selectedRows, 'multiple');
        },
        onGlobalFilterChange: (value: string) => {
            setTableState(prev => ({...prev, globalFilter: value}));
        },
    } as TableOptions<EntityData<TEntity>>), [
        currentPage,
        tanstackColumns,
        paginationInfo,
        tableState,
        primaryKeyMetadata,
        fetchRecords,
        setSorting,
        setSelection
    ]);


    const tanstackUtils = useMemo(() => ({
        resetTableState: () => {
            setTableState({
                sorting: [],
                columnVisibility: {},
                rowSelection: {},
                pagination: {
                    pageIndex: 0,
                    pageSize: 10,
                },
                globalFilter: '',
            });
        },
        setGlobalFilter: (filter: string) => {
            setTableState(prev => ({...prev, globalFilter: filter}));
        },
        setColumnVisibility: (visibility: VisibilityState) => {
            setTableState(prev => ({...prev, columnVisibility: visibility}));
        },
        getVisibleColumns: () => {
            return tanstackColumns.filter(col =>
                !tableState.columnVisibility[col.id as string]);
        },
        getSortedColumn: () => {
            return tableState.sorting[0]?.id || null;
        },
        getSelectedRowIds: () => {
            return Object.keys(tableState.rowSelection);
        },
        clearSelection: () => {
            setTableState(prev => ({...prev, rowSelection: {}}));
        },
    }), [tanstackColumns, tableState]);


    const columnUtils = useMemo(() => ({
        getPrimaryKeyColumns: () => {
            return tanstackColumns.filter(col =>
                (col.meta as TanStackColumnMeta)?.isPrimaryKey);
        },
        getDisplayColumn: () => {
            return tanstackColumns.find(col =>
                (col.meta as TanStackColumnMeta)?.isDisplayField);
        },
        getSortableColumns: () => {
            return tanstackColumns.filter(col =>
                (col.meta as TanStackColumnMeta)?.sortable);
        },
        getFilterableColumns: () => {
            return tanstackColumns.filter(col =>
                (col.meta as TanStackColumnMeta)?.filterable);
        },
    }), [tanstackColumns]);


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
        setSelection,
        clearSelection,
        setFilters,
        setSorting,
        clearFilters,
        refreshData,
        invalidateCache,


        matrxTableData: {
            config: tanstackConfig,
            state: tableState,
            columns: tanstackColumns,
            utils: tanstackUtils,
            columnUtils,
            defaultPageSize: 10,
        },

        // Error Handling
        lastError,
        clearError: () => setLastError(null),
        handleError,
    };
};
