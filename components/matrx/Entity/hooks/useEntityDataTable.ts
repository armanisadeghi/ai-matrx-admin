// hooks/useDataTable.ts
import * as React from "react"
import { useEntity } from "@/lib/redux/entity/hooks/useEntity"
import { EntityKeys } from "@/types/entityTypes"
import {useMemo, useState} from "react";
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
import {EntityDataWithId} from "@/lib/redux/entity/types/stateTypes";

interface TanStackTableState {
    sorting: SortingState
    columnVisibility: VisibilityState
    rowSelection: Record<string, boolean>  // Explicitly type this
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
export interface DataTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    variant?: 'default' | 'compact' | 'cards' | 'minimal';
    options?: {
        showCheckboxes?: boolean;
        showFilters?: boolean;
        showActions?: boolean;
        actions?: {
            showEdit?: boolean;
            showDelete?: boolean;
            showExpand?: boolean;
            custom?: Array<{
                label: string;
                onClick: (row: EntityDataWithId<TEntity>) => void;
                variant?: "outline" | "destructive";
                size?: "xs" | "sm";
            }>;
        };
    };
}

export const DEFAULT_TABLE_OPTIONS = {
    showCheckboxes: true,
    showFilters: true,
    showActions: true,
    defaultPageSize: 20,
    defaultPageSizeOptions: [5, 10, 25, 50, 100],
    actions: {
        showEdit: true,
        showDelete: true,
        showExpand: true,
    }
};


export function useEntityDataTable<TEntity extends EntityKeys>(entityKey: TEntity) {
    const {
        fieldInfo,
        primaryKeyMetadata,
        tableColumns,
        paginationInfo,
        currentPageWithRecordId,
        fetchRecords,
        setFilters,
        setSorting,
        loadingState,
        addToSelection,
        handleSingleSelection,
    } = useEntity(entityKey)

    const [tableState, setTableState] = useState<TanStackTableState>({
        sorting: [],
        columnVisibility: {},
        rowSelection: {},
        pagination: {
            pageIndex: 0,
            pageSize: DEFAULT_TABLE_OPTIONS.defaultPageSize,
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
        } as ColumnDef<EntityDataWithId<TEntity>>));  // Changed this type
    }, [tableColumns, fieldInfo]);


    const tanstackConfig = useMemo(() => ({
        data: currentPageWithRecordId,
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
        getRowId: (row: EntityDataWithId<TEntity>) => row.matrxRecordId,
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

            const changedRowId = Object.entries(newSelection)
                .find(([id, selected]) => selected !== tableState.rowSelection[id])?.[0];

            if (changedRowId) {
                addToSelection(changedRowId);
                setTableState(prev => ({...prev, rowSelection: newSelection}));
            }
        },

        onGlobalFilterChange: (value: string) => {
            setTableState(prev => ({...prev, globalFilter: value}));
        },
    } as TableOptions<EntityDataWithId<TEntity>>), [
        currentPageWithRecordId,
        tanstackColumns,
        paginationInfo,
        tableState,
        primaryKeyMetadata,
        fetchRecords,
        setSorting,
        addToSelection
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


    React.useEffect(() => {
        fetchRecords(1, DEFAULT_TABLE_OPTIONS.defaultPageSize);
    }, [entityKey, fetchRecords])


    return {
        loadingState,
        paginationInfo,
        handleSingleSelection,
        primaryKeyMetadata,
        matrxTableData: {
            tanstackConfig,
            tableState,
            tanstackColumns,
            tanstackUtils,
            columnUtils,
            defaults: DEFAULT_TABLE_OPTIONS,
        },
    }
}
