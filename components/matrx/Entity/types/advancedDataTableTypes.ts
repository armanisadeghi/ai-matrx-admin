import * as React from "react"
import {ButtonSize, ButtonVariant} from "../types/tableBuilderTypes"
import { EntityKeys, EntityData } from "@/types/entityTypes"
import {
    ColumnDef,
    SortingState,
    VisibilityState,
    PaginationState,
    RowSelectionState,
    ColumnFiltersState,
    ExpandedState,
    GroupingState,
    Table,
    RowModel,
    TableState as TanstackTableState,
    ColumnSizingState,
} from "@tanstack/react-table"


export interface TableFieldMetadata {
    key: string;
    title: string;
    dataType: string;
    isPrimaryKey: boolean;
    isDisplayField: boolean;
    isArray?: boolean;
    structure?: string;
    isNative?: boolean;
    defaultComponent?: string;
    componentProps?: Record<string, any>;
    isRequired?: boolean;
    maxLength?: number;
    defaultValue?: any;
    defaultGeneratorFunction?: string;
    validationFunctions?: string[];
    exclusionRules?: string[];
    databaseTable?: string;

    // Properties we add during column creation
    fieldType?: string;
    sortable?: boolean;
    filterable?: boolean;
    groupable?: boolean;
    format?: (value: any) => any;
    align?: 'left' | 'center' | 'right';
    width?: number;
}


export interface TableColumn {
    id: string;
    accessorKey: string;
    header: string | ((props: any) => any);
    cell: (props: { getValue: () => any; row?: any }) => any;
    enableSorting: boolean;
    enableGrouping: boolean;
    enableResizing: boolean;
    size?: number;
    minSize?: number;
    maxSize?: number;
    meta: TableFieldMetadata;
}


export interface TableState extends TanstackTableState {
    sorting: SortingState
    columnVisibility: VisibilityState
    rowSelection: RowSelectionState
    pagination: PaginationState
    globalFilter: string
    columnFilters: ColumnFiltersState
    expanded: ExpandedState
    grouping: GroupingState
    columnOrder: string[]
    columnPinning: { left?: string[], right?: string[] }
    rowPinning: { top?: string[], bottom?: string[] }
    columnSizingInfo: {
        startOffset: number
        startSize: number
        deltaOffset: number
        deltaPercentage: number
        isResizingColumn: string | false
        columnSizingStart: [string, number][]
    }
    columnSizing: ColumnSizingState
    density: TableDensity
}


export interface TableDisplayState {
    density: TableDensity
    columnSizing: ColumnSizingState
    grouping: GroupingState
}


// Formatting Options
export interface ValueFormattingOptions {
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


// Table Display Options
export type TableDensity = 'compact' | 'normal' | 'comfortable'
export type TableVariant = 'default' | 'cards' | 'minimal'

export interface TableFeatureFlags {
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
    showCheckboxes?: boolean  // Added
    showActions?: boolean     // Added
}

export interface TableDisplayOptions {
    showToolbar?: boolean
    showFilters?: boolean
    showColumnVisibility?: boolean
    showGlobalFilter?: boolean
    showPagination?: boolean
    showTooltips?: boolean
    maxCharacters?: number
    density?: TableDensity
    variant?: TableVariant
}

export interface TablePaginationOptions {
    defaultPageSize: number
    defaultPageSizeOptions: number[]
}

// Complete Table Options
export interface TableOptions extends
    TableFeatureFlags,
    TableDisplayOptions,
    TablePaginationOptions {
    formatting?: ValueFormattingOptions
    smartFields?: SmartFieldConfig
    actions?: ActionConfig
}

// Hook Props Interface
export interface UseAdvancedDataTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity
    options?: Partial<TableOptions>
    initialState?: Partial<TableState>
    onStateChange?: (state: TableState) => void
    onAction?: (action: string, row: EntityData<TEntity>) => void
}

// Table Configuration Type
export interface TableConfiguration<TData> {
    data: TData[]
    columns: ColumnDef<TData>[]
    pageCount: number
    state: TableState
    enableRowSelection: boolean
    enableMultiRowSelection: boolean
    enableSorting: boolean
    enableFiltering: boolean
    enableGrouping: boolean
    enableExpanding: boolean
    enablePinning: boolean
    enableColumnResizing: boolean
    manualPagination: boolean
    manualSorting: boolean
    getRowId: (row: TData) => string
    onStateChange: (updater: (state: TableState) => TableState | Partial<TableState>) => void
    onPaginationChange: (updater: any) => void
    onSortingChange: (updater: any) => void
    onRowSelectionChange: (updater: any) => void
    getCoreRowModel: (table: Table<TData>) => () => RowModel<TData>
    getSortedRowModel: (table: Table<TData>) => () => RowModel<TData>
    getFilteredRowModel: (table: Table<TData>) => () => RowModel<TData>
    getPaginationRowModel: (table: Table<TData>) => () => RowModel<TData>
    getExpandedRowModel?: (table: Table<TData>) => () => RowModel<TData>
    getGroupedRowModel?: (table: Table<TData>) => () => RowModel<TData>
    getFacetedRowModel?: (table: Table<TData>) => () => RowModel<TData>
    getFacetedUniqueValues?: (table: Table<TData>) => () => Map<any, number>
    getFacetedMinMaxValues?: (table: Table<TData>) => () => [number, number] | undefined
}

// Default Options
export const DEFAULT_OPTIONS: TableOptions = {
    // Pagination defaults
    defaultPageSize: 10,
    defaultPageSizeOptions: [5, 10, 25, 50, 100],

    // Feature flags
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
    showCheckboxes: true,
    showActions: true,

    // Display options
    maxCharacters: 100,
    showTooltips: true,
    showToolbar: true,
    showFilters: true,
    showColumnVisibility: true,
    showGlobalFilter: true,
    showPagination: true,
    density: 'normal',
    variant: 'default',

    // Formatting defaults
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


export interface ActionConfig {
    view?: {
        enabled: boolean;
        variant?: ButtonVariant;
        size?: ButtonSize;
        custom?: (row: any) => void;
    };
    edit?: {
        enabled: boolean;
        variant?: ButtonVariant;
        size?: ButtonSize;
        custom?: (row: any) => void;
    };
    delete?: {
        enabled: boolean;
        variant?: ButtonVariant;
        size?: ButtonSize;
        custom?: (row: any) => void;
    };
    custom?: Array<{
        key: string;
        label: string;
        variant?: ButtonVariant;
        size?: ButtonSize;
        handler: (row: any) => void;
    }>;
}

export interface SmartFieldConfig {
    string?: {
        component: 'text' | 'textarea' | 'markdown';
        props?: Record<string, any>;
    } | null;
    number?: {
        component: 'text' | 'slider' | 'currency';
        format?: 'decimal' | 'integer' | 'percentage' | 'currency';
        precision?: number;
        props?: Record<string, any>;
    } | null;
    boolean?: {
        component: 'switch' | 'checkbox' | 'text';
        props?: Record<string, any>;
    } | null;
    date?: {
        component: 'datepicker' | 'text';
        format?: string;
        props?: Record<string, any>;
    } | null;
    uuid?: {
        component: 'button' | 'link' | 'copy' | 'text';
        onUUIDClick?: (uuid: string) => void;
        label?: string;
        props?: Record<string, any>;
    } | null;
    object?: {
        component: 'json' | 'table' | 'text';
        collapsed?: boolean;
        props?: Record<string, any>;
    } | null;
    array?: {
        component: 'list' | 'chips' | 'table';
        itemComponent?: string;
        props?: Record<string, any>;
    } | null;
}



export function hasTableMeta<TData>(
    column: ColumnDef<TData>
): column is ColumnDef<TData> & { meta: TableFieldMetadata } {
    return column.meta !== undefined && 'align' in column.meta;
}

export function getColumnMeta<TData>(
    column: ColumnDef<TData>
): TableFieldMetadata | undefined {
    if (hasTableMeta(column)) {
        return column.meta;
    }
    return undefined;
}


export interface TableUtils<TData> {
    resetState: () => void
    getVisibleColumns: () => ColumnDef<TData>[]
    getPrimaryColumns: () => ColumnDef<TData>[]
    getSortableColumns: () => ColumnDef<TData>[]
    getFilterableColumns: () => ColumnDef<TData>[]
    getGroupableColumns: () => ColumnDef<TData>[]
    clearSelection: () => void
    setGlobalFilter: (filter: string) => void
    setColumnVisibility: (visibility: VisibilityState) => void
    getSortedColumn: () => string | null
    setDensity: (density: TableDensity) => void
    toggleColumnGrouping: (columnId: string, enabled: boolean) => void
    clearGrouping: () => void
    setColumnSizing: (sizing: ColumnSizingState) => void
}



/*
export interface FieldMetadata {
    key: string
    title: string
    isPrimaryKey: boolean
    isDisplayField: boolean
    dataType: string
    isArray?: boolean
    structure?: string
    isNative?: boolean
    defaultComponent?: string
    componentProps?: Record<string, any>
    isRequired?: boolean
    maxLength?: number
    defaultValue?: any
    defaultGeneratorFunction?: string
    validationFunctions?: string[]
    exclusionRules?: string[]
    databaseTable?: string
}

// Enhanced Column Meta that extends TanStack's meta
export interface ColumnMeta<TData = any, TValue = any> extends Record<string, any> {
    isPrimaryKey: boolean
    isDisplayField: boolean
    dataType: string
    fieldType?: string
    isArray?: boolean
    isNative?: boolean
    isRequired?: boolean
    structure?: string
    maxLength?: number
    validationFunctions?: string[]
    exclusionRules?: string[]
    defaultComponent?: string
    componentProps?: Record<string, any>
    defaultValue?: any
    defaultGeneratorFunction?: string
    databaseTable?: string
    sortable: boolean
    filterable: boolean
    groupable: boolean
    format?: (value: TValue) => string
    align?: 'left' | 'center' | 'right'
    width?: number
}

export function isTableColumn<TData>(column: ColumnDef<TData>): column is TableColumn<TData> {
    return 'meta' in column && 'accessorKey' in column;
}

type TableHeaderType<TData> = ColumnDefTemplate<HeaderContext<TData, unknown>>

*/
