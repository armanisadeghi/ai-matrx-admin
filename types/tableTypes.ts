'use client';

import {
    Column,
    UseGlobalFiltersInstanceProps,
    UsePaginationInstanceProps,
    UseSortByInstanceProps,
    UseTableInstanceProps,
    TableState, Cell, Row, HeaderGroup
} from 'react-table';

import React from "react";
import {FlexibleId} from './FlexibleId';

export interface TableData {
    id?: FlexibleId;
    [key: string]: any;
}


export interface MatrxTableProps {
    data: TableData[];
    actions?: string[];  // TODO: Connect Actions Directly to Redux Actions in a pattern designed specifically for Redux Tables.
    onAction?: (actionName: string, rowData: TableData) => void;
    defaultVisibleColumns?: string[];
    truncateAt?: number;
    className?: string;
    customModalContent?: (rowData: TableData) => React.ReactNode;
    onPageChange?: (pageIndex: number, pageSize: number) => void;
}

export interface ExtendedTableState extends TableState<TableData> {
    globalFilter: any;
    pageIndex: number;
    pageSize: number;
}

export type TableInstance = UseTableInstanceProps<TableData> &
    UseGlobalFiltersInstanceProps<TableData> &
    UsePaginationInstanceProps<TableData> &
    UseSortByInstanceProps<TableData>;


export interface ActionDefinition {
    name: string;
    label: string;
    icon: React.ReactNode;
    className?: string;
}

export interface MatrxColumnSettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: Column<TableData>[];
    visibleColumns: string[];
    setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
}


export interface ModernTableProps {
    columns: Column<TableData>[];
    data: TableData[];
    defaultVisibleColumns?: string[];
    className?: string;
    onAdd: (newItem: Omit<TableData, 'id'>) => void;
    onEdit: (item: TableData) => void;
    onDelete: (item: TableData) => void;
    onExpand: (item: TableData) => void;
}


export interface ExtendedTableState extends TableState<TableData> {
    globalFilter: any;
    pageIndex: number;
    pageSize: number;
}

export interface Action {
    name: string;
    position?: 'above' | 'before' | 'below' | 'after' | 'behind' | 'over';
}

export type MatrixColumn<T extends object> = Column<T> & {
    actions?: Action[];
};

export interface CustomTableCellProps {
    cell: Cell<TableData>;
    truncateText: (text: unknown, maxLength?: number) => string;
    actions: ActionDefinition[];
    rowData: TableData;
    onAction: (actionName: string, rowData: TableData) => void;
}

export interface ColumnSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: Column<TableData>[];
    visibleColumns: string[];
    setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface CustomTableBodyProps {
    page: Row<TableData>[];
    prepareRow: (row: Row<TableData>) => void;
    truncateText: (text: unknown, maxLength?: number) => string;
    actions: ActionDefinition[];
    onAction: (actionName: string, rowData: TableData) => void;
    visibleColumns: string[];
}

export interface TableHeaderProps {
    headerGroups: HeaderGroup<TableData>[];
}

export interface DialogFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'add' | 'edit' | 'delete' | 'view';
    columns: Column<TableData>[];
    data: TableData | null;
    onAction: (action: string, formData?: Record<string, string>) => void;
}
