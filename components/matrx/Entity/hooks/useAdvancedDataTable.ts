import * as React from "react"
import {useEntity} from "@/lib/redux/entity/useEntity"
import {EntityKeys, EntityData} from "@/types/entityTypes"
import {
    SortingState,
    VisibilityState,
    PaginationState,
    RowSelectionState,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getExpandedRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFacetedMinMaxValues,
    getGroupedRowModel,
    ColumnFiltersState,
    ExpandedState,
    GroupingState,
} from "@tanstack/react-table"
import {createRecordKey} from "@/lib/redux/entity/utils"
import {Draft} from "@reduxjs/toolkit"
import {ButtonSize, ButtonVariant} from "../types/tableBuilderTypes"
import {
    ActionConfig,
    createActionColumn,
    createSmartCellRenderer,
    SmartFieldConfig
} from "@/components/matrx/Entity/addOns/smartCellRender"
import {DEFAULT_TABLE_OPTIONS} from "@/components/matrx/Entity/hooks/useEntityDataTable";

interface TableState {
    sorting: SortingState
    columnVisibility: VisibilityState
    rowSelection: RowSelectionState
    pagination: PaginationState
    globalFilter: string
    columnFilters: ColumnFiltersState
    expanded: ExpandedState
    grouping: GroupingState
}

interface ValueFormattingOptions {
    emptyValue?: string
    nullValue?: string
    undefinedValue?: string
    booleanFormat?: {
        true: string
        false: string
    }
    dateFormat?: string
    numberFormat?: {
        minimumFractionDigits?: number
        maximumFractionDigits?: number
        style?: 'decimal' | 'currency' | 'percent'
        currency?: string
    }
}

interface ColumnMeta {
    isPrimaryKey?: boolean;
    isDisplayField?: boolean;
    fieldType?: string;
    sortable?: boolean;
    filterable?: boolean;
    groupable?: boolean;
    align?: 'left' | 'center' | 'right';
    format?: any;
    validation?: any;
}


interface TableFeatureOptions {
    enableSorting?: boolean
    enableFiltering?: boolean
    enableGrouping?: boolean
    enableExpanding?: boolean
    enablePinning?: boolean
    enableRowSelection?: boolean
    enableColumnResizing?: boolean
    enableGlobalFilter?: boolean
    enablePagination?: boolean
    manualPagination?: boolean
    enableFaceting?: boolean
}

interface TableDisplayOptions {
    showToolbar?: boolean
    showFilters?: boolean
    showColumnVisibility?: boolean
    showGlobalFilter?: boolean
    showPagination?: boolean
    density?: 'compact' | 'normal' | 'comfortable'
    variant?: 'default' | 'cards' | 'minimal'
}


interface TableOptions extends TableFeatureOptions, TableDisplayOptions {
    formatting?: ValueFormattingOptions
    smartFields?: SmartFieldConfig
    actions?: ActionConfig
    defaultPageSize: number
    defaultPageSizeOptions: number[]
    maxCharacters: number
    showTooltips: boolean
}

const DEFAULT_OPTIONS: TableOptions = {
    // Feature Options
    enableSorting: true,
    enableFiltering: true,
    enableGrouping: false,
    enableExpanding: false,
    enablePinning: false,
    enableRowSelection: true,
    enableColumnResizing: true,
    enableGlobalFilter: true,
    enablePagination: true,
    manualPagination: true,
    enableFaceting: false,
    // Pagination Options
    defaultPageSize: 10,
    defaultPageSizeOptions: [5, 10, 25, 50, 100],

    // Display Options
    maxCharacters: 100,
    showTooltips: true,
    showToolbar: true,
    showFilters: true,
    showColumnVisibility: true,
    showGlobalFilter: true,
    showPagination: true,
    density: 'normal',
    variant: 'default',
    // Formatting Options
    formatting: {
        emptyValue: '',
        nullValue: '',
        undefinedValue: '',
        booleanFormat: {
            true: 'Yes',
            false: 'No'
        },
        dateFormat: 'MM/dd/yyyy',
        numberFormat: {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            style: 'decimal'
        }
    }
}

export interface UseAdvancedDataTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity
    options?: Partial<TableOptions>
    initialState?: Partial<TableState>
    onStateChange?: (state: TableState) => void
    onAction?: (action: string, row: EntityData<TEntity>) => void
}

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

    const {
        fieldInfo,
        primaryKeyMetadata,
        tableColumns,
        paginationInfo,
        currentPage,
        fetchRecords,
        setFilters: setEntityFilters,
        setSorting: setEntitySorting,
        setSelection: setEntitySelection,
        loadingState,
    } = useEntity(entityKey)

    // Initialize table state with stable reference
    const [tableState, setTableState] = React.useState<TableState>(() => ({
        sorting: [],
        columnVisibility: {},
        rowSelection: {},
        pagination: {
            pageIndex: paginationInfo.page - 1,
            pageSize: paginationInfo.pageSize,
        },
        globalFilter: '',
        columnFilters: [],
        expanded: {},
        grouping: [],
        ...initialState
    }))

    // Memoize state change handler
    const handleStateChange = React.useCallback((
        updater: (state: TableState) => TableState | Partial<TableState>
    ) => {
        setTableState(prev => {
            const newState = {...prev, ...updater(prev)}
            onStateChange?.(newState)
            return newState
        })
    }, [onStateChange])

    const truncateText = React.useCallback((text: string) => {
        if (!text) return ''
        return text.length > options.maxCharacters
            ? `${text.substring(0, options.maxCharacters)}...`
            : text
    }, [options.maxCharacters])

    const formatCellValue = React.useCallback((
        value: any,
        fieldType: string,
        meta?: ColumnMeta
    ) => {

        if (value === null) return options.formatting?.nullValue
        if (value === undefined) return options.formatting?.undefinedValue
        if (value === '') return options.formatting?.emptyValue

        // Use custom format if provided
        if (meta?.format) {
            return meta.format(value)
        }

        switch (fieldType.toLowerCase()) {
            case 'boolean':
                return value
                    ? options.formatting.booleanFormat.true
                    : options.formatting.booleanFormat.false
            case 'date':
                return value instanceof Date
                    ? new Intl.DateTimeFormat('en-US', {
                        dateStyle: 'medium'
                    }).format(value)
                    : value
            case 'number':
                return typeof value === 'number' ?
                       new Intl.NumberFormat('en-US', options.formatting?.numberFormat).format(value) : value
            case 'currency':
                return typeof value === 'number' ?
                       new Intl.NumberFormat('en-US', {
                           ...options.formatting?.numberFormat,
                           style: 'currency',
                           currency: options.formatting?.numberFormat?.currency || 'USD'
                       }).format(value) : value
            default:
                return truncateText(value)
        }
    }, [options.formatting])

    // Memoize columns configuration
    const columns = React.useMemo(() => {
        if (!tableColumns) return []

        const baseColumns = tableColumns.map(col => {
            const fieldMetadata = col
            const fieldType = fieldMetadata?.dataType

            return {
                id: col.key,
                accessorKey: col.key,
                header: col.title,
                cell: ({getValue, row}) => {
                    const value = getValue()
                    const meta = {
                        isPrimaryKey: col.isPrimaryKey,
                        isDisplayField: col.isDisplayField,
                        dataType: fieldMetadata?.dataType,
                        isArray: fieldMetadata?.isArray,
                        structure: fieldMetadata?.structure,
                        isNative: fieldMetadata?.isNative,
                        defaultComponent: fieldMetadata?.defaultComponent,
                        componentProps: fieldMetadata?.componentProps,
                        isRequired: fieldMetadata?.isRequired,
                        maxLength: fieldMetadata?.maxLength,
                        defaultValue: fieldMetadata?.defaultValue,
                        defaultGeneratorFunction: fieldMetadata?.defaultGeneratorFunction,
                        validationFunctions: fieldMetadata?.validationFunctions,
                        exclusionRules: fieldMetadata?.exclusionRules,
                        databaseTable: fieldMetadata?.databaseTable,
                        fieldType,
                        sortable: !col.isPrimaryKey,
                        filterable: !col.isPrimaryKey,
                        groupable: !col.isPrimaryKey,
                        align: fieldMetadata?.align || 'left',
                        format: fieldMetadata?.format,
                        validation: fieldMetadata?.validationFunctions,
                    }

                    if (options.smartFields && options.smartFields[fieldType as keyof SmartFieldConfig]) {
                        const smartRenderer = createSmartCellRenderer(
                            fieldType,
                            col.key,
                            options.smartFields,
                            {}
                        );

                        if (smartRenderer) {
                            const smartResult = smartRenderer({getValue, row});
                            if (smartResult !== undefined) {
                                return smartResult;
                            }
                        }
                    } else {
                        console.log(`No smart field configuration found for field type: ${fieldType}`);
                    }

                    return formatCellValue(value, fieldType, meta)
                },
            enableSorting: options.enableSorting && !col.isPrimaryKey,
            enableGrouping: options.enableGrouping && !col.isPrimaryKey,
                enableResizing: options.enableColumnResizing,
                meta: {
                    isPrimaryKey: col.isPrimaryKey,
                    isDisplayField: col.isDisplayField,
                    fieldType,
                sortable: !col.isPrimaryKey && options.enableSorting,
                    filterable: !col.isPrimaryKey,
                    groupable: !col.isPrimaryKey,
                    align: fieldMetadata?.align || 'left',
                    format: fieldMetadata?.format,
                    validation: fieldMetadata?.validation,
                } as ColumnMeta
            }
        })

        if (options.actions) {
            baseColumns.push(createActionColumn(options.actions, onAction || (() => {
            })))
        }

        return baseColumns
    }, [
        tableColumns,
        fieldInfo,
        options.enableSorting,
        options.enableGrouping,
        options.enableColumnResizing,
        options.smartFields,
        options.actions,
        formatCellValue,
        onAction
    ])

    // Memoize table configuration
    const tableConfig = React.useMemo(() => ({
        data: currentPage,
        columns,
        pageCount: paginationInfo.totalPages,
        state: tableState,

        // Core functionality
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

        // Feature flags
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
        getRowId: (row: EntityData<TEntity>) => createRecordKey(primaryKeyMetadata, row),

        // State management
        onStateChange: handleStateChange,

        // Pagination handlers
        onPaginationChange: (updater: any) => {
            const newPagination = typeof updater === 'function' ? updater(tableState.pagination) : updater
            handleStateChange(state => ({...state, pagination: newPagination}))
            fetchRecords(newPagination.pageIndex + 1, newPagination.pageSize)
        },

        // Sorting handlers
        onSortingChange: (updater: any) => {
            const newSorting = typeof updater === 'function' ? updater(tableState.sorting) : updater
            handleStateChange(state => ({...state, sorting: newSorting}))
            if (newSorting.length > 0) {
                setEntitySorting({
                    field: newSorting[0].id,
                    direction: newSorting[0].desc ? 'desc' : 'asc'
                })
            }
        },

        // Selection handlers
        onRowSelectionChange: (updater: any) => {
            const newSelection = typeof updater === 'function' ? updater(tableState.rowSelection) : updater
            handleStateChange(state => ({...state, rowSelection: newSelection}))
            const selectedRows = currentPage
                .filter((_, index) => newSelection[index]) as Draft<EntityData<TEntity>>[]
            setEntitySelection(selectedRows, selectedRows.length === 1 ? 'single' : 'multiple')
        },
    }), [
        currentPage,
        columns,
        paginationInfo.totalPages,
        tableState,
        options,
        primaryKeyMetadata,
        handleStateChange,
        fetchRecords,
        setEntitySorting,
        setEntitySelection
    ])

    // Memoize table utilities
    const tableUtils = React.useMemo(() => ({
        resetState: () => handleStateChange(() => initialState || {}),
        getVisibleColumns: () => columns.filter(col => !tableState.columnVisibility[col.id as string]),
        getPrimaryColumns: () => columns.filter(col => (col.meta as ColumnMeta)?.isPrimaryKey),
        getSortableColumns: () => columns.filter(col => (col.meta as ColumnMeta)?.sortable),
        getFilterableColumns: () => columns.filter(col => (col.meta as ColumnMeta)?.filterable),
        clearSelection: () => handleStateChange(state => ({...state, rowSelection: {}})),
        setGlobalFilter: (filter: string) => handleStateChange(state => ({...state, globalFilter: filter})),
        setColumnVisibility: (visibility: VisibilityState) =>
            handleStateChange(state => ({...state, columnVisibility: visibility})),
        getSortedColumn: () => tableState.sorting[0]?.id || null,
    }), [columns, tableState, handleStateChange, initialState])

    React.useEffect(() => {
        fetchRecords(1, options.defaultPageSize)
    }, [entityKey, options.defaultPageSize, fetchRecords])

    return {
        loadingState,
        paginationInfo,
        tableState,
        tableConfig,
        tableUtils,
        options,
    }
}
