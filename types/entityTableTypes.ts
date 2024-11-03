'use client';

import {
    Column,
    UseGlobalFiltersInstanceProps,
    UsePaginationInstanceProps,
    UseSortByInstanceProps,
    UseTableInstanceProps,
    TableState,
    Cell,
    Row,
    HeaderGroup,
} from 'react-table';
import React from "react";
import { FlexibleId } from '@/types/FlexibleId';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { ActionContext } from '@/components/matrx/EntityTable/EnhancedAction/EntityMatrxActions';

// Base Types - Keeping original TableData for backward compatibility
export interface TableData {
    id?: FlexibleId;
    [key: string]: any;
}

// New Entity-Aware Table Props
export interface EnhancedMatrxTableProps<TEntity extends EntityKeys> {
    data: EntityData<TEntity>[];
    entityKey: TEntity;
    actions?: string[];
    onAction?: (actionName: string, rowData: EntityData<TEntity>) => void;
    defaultVisibleColumns?: string[];
    truncateAt?: number;
    className?: string;
    customModalContent?: (rowData: EntityData<TEntity>) => React.ReactNode;
    isServerSide?: boolean;
    loading?: boolean;
    totalCount?: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    serverPage?: number;
    serverPageSize?: number;
}

// Original MatrxTableProps kept for backward compatibility
export interface MatrxTableProps {
    data: TableData[];
    actions?: string[];
    onAction?: (actionName: string, rowData: TableData) => void;
    defaultVisibleColumns?: string[];
    truncateAt?: number;
    className?: string;
    customModalContent?: (rowData: TableData) => React.ReactNode;
    onPageChange?: (pageIndex: number, pageSize: number) => void;
    loading?: boolean;
    totalCount?: number;
}

// Enhanced Action Definition
export interface EnhancedActionDefinition<TEntity extends EntityKeys> {
    name: string;
    label: string | ((data: EntityData<TEntity>) => string);
    icon: React.ReactNode | ((data: EntityData<TEntity>) => React.ReactNode);
    className?: string | ((data: EntityData<TEntity>) => string);
    type?: 'entity' | 'relationship' | 'service' | 'navigation' | 'custom';
    handler: (context: ActionContext<TEntity>) => void | Promise<void>;
    isVisible?: (data: EntityData<TEntity>) => boolean;
    isEnabled?: (data: EntityData<TEntity>) => boolean;
}

// Original Action Definition kept for backward compatibility
export interface ActionDefinition {
    name: string;
    label: string;
    icon: React.ReactNode;
    className?: string;
}

// Enhanced Table State
export interface EnhancedTableState<TEntity extends EntityKeys> extends TableState<EntityData<TEntity>> {
    globalFilter: any;
    pageIndex: number;
    pageSize: number;
    serverSide?: {
        loading: boolean;
        totalCount: number;
        error?: any;
    };
}

// Original ExtendedTableState kept for backward compatibility
export interface ExtendedTableState extends TableState<TableData> {
    globalFilter: any;
    pageIndex: number;
    pageSize: number;
}

// Enhanced Table Instance
export interface EnhancedTableInstance<TEntity extends EntityKeys>
    extends UseTableInstanceProps<EntityData<TEntity>>,
        UseGlobalFiltersInstanceProps<EntityData<TEntity>>,
        UsePaginationInstanceProps<EntityData<TEntity>>,
        UseSortByInstanceProps<EntityData<TEntity>> {
    state: EnhancedTableState<TEntity>;
}

// Original TableInstance kept for backward compatibility
export type TableInstance = UseTableInstanceProps<TableData> &
    UseGlobalFiltersInstanceProps<TableData> &
    UsePaginationInstanceProps<TableData> &
    UseSortByInstanceProps<TableData>;

// Component Props - Updated with entity awareness
export interface MatrxColumnSettingsProps<TEntity extends EntityKeys> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: Column<EntityData<TEntity>>[];
    visibleColumns: string[];
    setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface CustomTableCellProps<TEntity extends EntityKeys> {
    cell: Cell<EntityData<TEntity>>;
    truncateText: (text: unknown, maxLength?: number) => string;
    actions: EnhancedActionDefinition<TEntity>[];
    rowData: EntityData<TEntity>;
    onAction: (actionName: string, rowData: EntityData<TEntity>) => void;
}

// Keep the rest of the interfaces as they are for now
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

export interface Action {
    name: string;
    position?: 'above' | 'before' | 'below' | 'after' | 'behind' | 'over';
}

export type MatrixColumn<T extends object> = Column<T> & {
    actions?: Action[];
};

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
