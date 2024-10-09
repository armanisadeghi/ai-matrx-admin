import {
    Column,
    HeaderGroup, TableState,
    UseGlobalFiltersInstanceProps,
    UsePaginationInstanceProps, UseSortByInstanceProps,
    UseTableInstanceProps
} from "react-table";
import React from "react";

export interface TableData {
    id?: number | string;
    [key: string]: any;
}

export interface MatrxTableProps {
    data: TableData[];
    actions?: string[];
    onAction?: (actionName: string, rowData: TableData) => void;
    defaultVisibleColumns?: string[];
    truncateAt?: number;
    className?: string;
    customModalContent?: (rowData: TableData) => React.ReactNode;
    onPageChange?: (pageIndex: number, pageSize: number) => void;
}

export type TableInstance = UseTableInstanceProps<TableData> &
    UseGlobalFiltersInstanceProps<TableData> &
    UsePaginationInstanceProps<TableData> &
    UseSortByInstanceProps<TableData>;

export interface ExtendedTableState extends TableState<TableData> {
    globalFilter: any;
    pageIndex: number;
    pageSize: number;
}



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
