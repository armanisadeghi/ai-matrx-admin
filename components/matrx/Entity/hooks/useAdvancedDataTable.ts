// components/matrx/Entity/hooks/useAdvancedDataTable.ts

import * as React from "react"
import {useEntity} from "@/lib/redux/entity/hooks/useEntity"
import {createRecordKey} from "@/lib/redux/entity/utils/stateHelpUtils"
import {Draft} from "@reduxjs/toolkit"
import {
    createActionColumn,
    createSmartCellRenderer, formatCellValue,
} from "@/components/matrx/Entity/addOns/smartCellRender"
import {EntityKeys} from "@/types/entityTypes"
import {
    VisibilityState,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getGroupedRowModel,
    getExpandedRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFacetedMinMaxValues,
    ColumnSizingState,
    GroupingState, RowSelectionState,
} from "@tanstack/react-table"
import {
    UseAdvancedDataTableProps,
    DEFAULT_OPTIONS,
    TableState,
    TableDisplayState,
    TableDensity,
    TableFieldMetadata, TableColumn
} from "@/components/matrx/Entity/types/advancedDataTableTypes"
import {EntityDataWithId} from "@/lib/redux/entity/types/stateTypes";


export function useAdvancedDataTable<TEntity extends EntityKeys>(
    {
        entityKey,
        options: userOptions = {},
        initialState,
        onStateChange,
        onAction
    }: UseAdvancedDataTableProps<TEntity>) {

    const options = React.useMemo(
        () => ({...DEFAULT_OPTIONS, ...userOptions}),
        [userOptions]
    )

    const initialPageSize = React.useMemo(() =>
            options.defaultPageSize || DEFAULT_OPTIONS.defaultPageSize,
        [options.defaultPageSize]
    )

    const {
        fieldInfo,
        primaryKeyMetadata,
        tableColumns,
        paginationInfo,
        currentPageWithRecordId,
        fetchRecords,
        setFilters: setEntityFilters,
        setSorting: setEntitySorting,
        addToSelection,
        handleSingleSelection,
        loadingState,
    } = useEntity(entityKey)

    const [tableState, setTableState] = React.useState<TableState>(() => ({
        sorting: [],
        columnVisibility: {},
        rowSelection: {},
        pagination: {
            pageIndex: paginationInfo.page - 1,
            pageSize: initialPageSize,
        },
        globalFilter: '',
        columnFilters: [],
        expanded: {},
        grouping: [],
        columnOrder: [],
        columnPinning: {},
        rowPinning: {},
        columnSizingInfo: {
            startOffset: 0,
            startSize: 0,
            deltaOffset: 0,
            deltaPercentage: 0,
            isResizingColumn: false,
            columnSizingStart: [],
        },
        columnSizing: {},
        density: options.density || 'normal',
        ...initialState
    }))


    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

    const [displayState, setDisplayState] = React.useState<TableDisplayState>({
        density: options.density || 'normal',
        columnSizing: {},
        grouping: []
    })

    const handleStateChange = React.useCallback((
        updater: (state: TableState) => TableState | Partial<TableState>
    ) => {
        setTableState(prev => {
            const newState = {...prev, ...updater(prev)}
            onStateChange?.(newState)
            return newState
        })
    }, [onStateChange])

    const handleDisplayStateChange = React.useCallback((
        updates: Partial<TableDisplayState>
    ) => {
        setDisplayState(prev => ({...prev, ...updates}))
    }, [])

    const formatCellValueMemoized = React.useCallback((
        value: any,
        fieldType: string,
        meta?: any
    ) => {
        return formatCellValue(value, fieldType, options.formatting, options.maxCharacters, meta);
    }, [options.formatting, options.maxCharacters]);


    const columns: TableColumn[] = React.useMemo(() => {
        if (!tableColumns) return [];

        const baseColumns: TableColumn[] = tableColumns.map(col => {
            const fieldMetadata = col as TableFieldMetadata;
            const fieldType = fieldMetadata.dataType;
            const width = fieldInfo[col.key]?.width;

            const enrichedMetadata: TableFieldMetadata = {
                ...fieldMetadata,
                sortable: !fieldMetadata.isPrimaryKey,
                filterable: !fieldMetadata.isPrimaryKey,
                groupable: !fieldMetadata.isPrimaryKey,
                align: fieldInfo[col.key]?.align || 'left',
                width
            };

            return {
                id: col.key,
                accessorKey: col.key,
                header: col.title,
                cell: ({getValue}: { getValue: () => any }) => {
                    const value = getValue();

                    if (options.smartFields?.[fieldType] && options.smartFields[fieldType] !== null) {
                        const smartRenderer = createSmartCellRenderer(
                            fieldType,
                            col.key,
                            options.smartFields,
                            {
                                isNative: fieldMetadata.isNative ?? true,
                                databaseTable: fieldMetadata.databaseTable
                            }
                        );

                        if (smartRenderer) {
                            const smartResult = smartRenderer({getValue});
                            if (smartResult !== undefined) {
                                return smartResult;
                            }
                        }
                    }
                    return formatCellValueMemoized(value, fieldType, enrichedMetadata);
                },
                enableSorting: options.enableSorting && !fieldMetadata.isPrimaryKey,
                enableGrouping: options.enableGrouping && !fieldMetadata.isPrimaryKey,
                enableResizing: options.enableColumnResizing,
                size: width,
                minSize: width,
                maxSize: width,
                meta: enrichedMetadata
            } as TableColumn;
        });

        if (options.actions) {
            const actionColumn: TableColumn = createActionColumn<TEntity>(
                options.actions,
                (action: string, row: EntityDataWithId<TEntity>) => {
                    onAction?.(action, row);
                }
            ) as TableColumn;
            baseColumns.push(actionColumn);
        }

        return baseColumns;
    }, [
        tableColumns,
        fieldInfo,
        options.enableSorting,
        options.enableGrouping,
        options.enableColumnResizing,
        options.smartFields,
        options.actions,
        formatCellValueMemoized,
        onAction
    ]);

    const tableConfig: any = React.useMemo(() => ({
        data: currentPageWithRecordId,
        columns,
        pageCount: paginationInfo.totalPages,
        state: {
            ...tableState,
            density: displayState.density,
            columnSizing: displayState.columnSizing,
            grouping: displayState.grouping,
            pagination: {
                pageIndex: paginationInfo.page - 1,
                pageSize: options.defaultPageSize || DEFAULT_OPTIONS.defaultPageSize
            }
        },

        // All the core functionality
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),

        // Optional models based on features
        ...(options.enableGrouping && {getGroupedRowModel: getGroupedRowModel()}),
        ...(options.enableExpanding && {getExpandedRowModel: getExpandedRowModel()}),
        ...(options.enableFaceting && {
            getFacetedRowModel: getFacetedRowModel(),
            getFacetedUniqueValues: getFacetedUniqueValues(),
            getFacetedMinMaxValues: getFacetedMinMaxValues(),
        }),

        // Feature flags and handlers
        enableRowSelection: options.enableRowSelection,
        enableMultiRowSelection: options.enableRowSelection,
        enableSorting: options.enableSorting,
        enableFiltering: options.enableFiltering,
        enableGrouping: options.enableGrouping,
        enableExpanding: options.enableExpanding,
        enablePinning: options.enablePinning,
        enableColumnResizing: options.enableColumnResizing,


        // Manual controls
        manualPagination: true,
        manualSorting: true,

        // Row identification
        getRowId: (row: EntityDataWithId<TEntity>) => {
            return row.matrxRecordId;
        },

        // State management
        onStateChange: handleStateChange,

        // Column sizing handler
        onColumnSizingChange: (updater: ColumnSizingState) => {
            handleDisplayStateChange({columnSizing: updater})
        },

        // Grouping handler
        onGroupingChange: (updater: GroupingState) => {
            handleDisplayStateChange({grouping: updater})
        },

        // Pagination handlers
        onPaginationChange: (updater: any) => {
            const newPagination = typeof updater === 'function'
                                  ? updater(tableState.pagination)
                                  : updater

            // Handle page size changes
            if (newPagination.pageSize !== tableState.pagination.pageSize) {
                handleStateChange(state => ({
                    ...state,
                    pagination: {
                        pageIndex: 0,
                        pageSize: newPagination.pageSize
                    }
                }))
                fetchRecords(1, newPagination.pageSize)
            } else {
                // Handle page navigation
                handleStateChange(state => ({
                    ...state,
                    pagination: newPagination
                }))
                fetchRecords(newPagination.pageIndex + 1, newPagination.pageSize)
            }
        },

        onSortingChange: (updater: any) => {
            const newSorting = typeof updater === 'function'
                               ? updater(tableState.sorting)
                               : updater
            handleStateChange(state => ({...state, sorting: newSorting}))
            console.log("newSorting", newSorting)
            if (newSorting.length > 0) {
                setEntitySorting({
                    field: newSorting[0].id,
                    direction: newSorting[0].desc ? 'desc' : 'asc'
                })
            }
        },

        onRowSelectionChange: (updater: any) => {
            const newSelection = typeof updater === 'function'
                                 ? updater(tableState.rowSelection)
                                 : updater;

            // First find what changed
            const changedRowId = Object.entries(newSelection)
                .find(([id, selected]) => selected !== tableState.rowSelection[id])?.[0];

            if (changedRowId) {
                // Update Redux first
                addToSelection(changedRowId);

                // Then update local state
                setTableState(prev => ({...prev, rowSelection: newSelection}));
            }
        },

        // Utility methods
        resetState: () => {
            handleStateChange(() => initialState || {})
            handleDisplayStateChange({
                density: options.density || 'normal',
                columnSizing: {},
                grouping: []
            })
        },
        setGlobalFilter: (filter: string) =>
            handleStateChange(state => ({...state, globalFilter: filter})),

        setDensity: (density: TableDensity) =>
            handleDisplayStateChange({density}),

        setColumnVisibility: (visibility: VisibilityState) =>
            handleStateChange(state => ({...state, columnVisibility: visibility})),

        getVisibleColumns: () => columns.filter(col => !tableState.columnVisibility[col.id as string]),
        getPrimaryColumns: () => columns.filter(col => col.meta?.isPrimaryKey),
        getSortableColumns: () => columns.filter(col => col.meta?.sortable),
        getFilterableColumns: () => columns.filter(col => col.meta?.filterable),
        getGroupableColumns: () => columns.filter(col => col.meta?.groupable),

        clearSelection: () => handleStateChange(state => ({...state, rowSelection: {}})),
        getSortedColumn: () => tableState.sorting[0]?.id || null,

        toggleColumnGrouping: (columnId: string, enabled: boolean) => {
            const currentGrouping = displayState.grouping
            const newGrouping = enabled
                                ? [...currentGrouping, columnId]
                                : currentGrouping.filter(id => id !== columnId)
            handleDisplayStateChange({grouping: newGrouping})
        },

        clearGrouping: () => handleDisplayStateChange({grouping: []}),
        setColumnSizing: (sizing: ColumnSizingState) => handleDisplayStateChange({columnSizing: sizing}),
    }), [
        currentPageWithRecordId,
        columns,
        paginationInfo,
        tableState,
        displayState,
        options,
        primaryKeyMetadata,
        handleStateChange,
        handleDisplayStateChange,
        fetchRecords,
        setEntitySorting,
        addToSelection,
        handleSingleSelection,
        initialState
    ])

    // Enhanced table utilities
    const tableUtils = React.useMemo(() => ({
        resetState: () => {
            handleStateChange(() => initialState || {})
            handleDisplayStateChange({
                density: options.density || 'normal',
                columnSizing: {},
                grouping: []
            })
        },
        getVisibleColumns: () => columns.filter(col => !tableState.columnVisibility[col.id as string]),
        getPrimaryColumns: () => columns.filter(col => (col.meta as TableFieldMetadata)?.isPrimaryKey),
        getSortableColumns: () => columns.filter(col => (col.meta as TableFieldMetadata)?.sortable),
        getFilterableColumns: () => columns.filter(col => (col.meta as TableFieldMetadata)?.filterable),
        getGroupableColumns: () => columns.filter(col => (col.meta as TableFieldMetadata)?.groupable),
        clearSelection: () => handleStateChange(state => ({...state, rowSelection: {}})),
        setGlobalFilter: (filter: string) => handleStateChange(state => ({...state, globalFilter: filter})),

        setColumnVisibility: (visibility: VisibilityState) =>
            handleStateChange(state => ({...state, columnVisibility: visibility})),

        getSortedColumn: () => tableState.sorting[0]?.id || null,
        setDensity: (density: TableDensity) => handleDisplayStateChange({density}),

        toggleColumnGrouping: (columnId: string, enabled: boolean) => {
            const currentGrouping = displayState.grouping
            const newGrouping = enabled
                                ? [...currentGrouping, columnId]
                                : currentGrouping.filter(id => id !== columnId)
            handleDisplayStateChange({grouping: newGrouping})
        },

        clearGrouping: () => handleDisplayStateChange({grouping: []}),
        setColumnSizing: (sizing: ColumnSizingState) => handleDisplayStateChange({columnSizing: sizing}),
    }), [
        columns,
        tableState,
        displayState,
        handleStateChange,
        handleDisplayStateChange,
        initialState,
        options.density,
        addToSelection,
        handleSingleSelection,
    ])


    React.useEffect(() => {
        fetchRecords(1, initialPageSize)
    }, [entityKey, initialPageSize, fetchRecords])

    return {
        loadingState,
        paginationInfo,
        tableState,
        tableConfig,
        tableUtils,
        options,
        addToSelection,
        handleSingleSelection,
    }
}
