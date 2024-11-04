'use client';

import {
    ColumnDef,
    Table as TanStackTable, // Import Table instance type from TanStack Table
    Row as TanStackRow,
    HeaderGroup as TanStackHeaderGroup,
    Cell as TanStackCell, Row,
} from '@tanstack/react-table';
import React from "react";
import {FlexibleId} from '@/types/FlexibleId';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {ActionContext} from '@/components/matrx/EntityTable/EnhancedAction/EntityMatrxActions';

// Base Types - Keeping original TableData for backward compatibility
export interface TableData {
    id?: FlexibleId;

    [key: string]: any;
}

export interface MatrxServerTableProps<TEntity extends EntityKeys> {
    data: EntityData<TEntity>[];
    primaryKey: keyof EntityData<TEntity>;
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
    columnHeaders?: Record<string, string>; // Add this to support pretty names
    displayField?: string; // Add this to support display field
}

// Updated Column Definition Types for TanStack Table v8
export type EnhancedColumnDef<TEntity extends EntityKeys> = ColumnDef<EntityData<TEntity>, unknown>;

// Enhanced Table State for TanStack Table
export interface EnhancedTableState<TEntity extends EntityKeys> {
    globalFilter: any;
    pageIndex: number;
    pageSize: number;
    serverSide?: {
        loading: boolean;
        totalCount: number;
        error?: any;
    };
}

// Enhanced Table Instance for TanStack Table
export interface EnhancedTableInstance<TEntity extends EntityKeys> {
    table: TanStackTable<EntityData<TEntity>>;
    state: EnhancedTableState<TEntity>;
}

// Component Props - Updated with entity awareness
export interface MatrxColumnSettingsProps<TEntity extends EntityKeys> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: EnhancedColumnDef<TEntity>[];
    visibleColumns: string[];
    setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
    columnHeaders?: Record<string, string>; // Add this
}


export interface TableHeaderProps<TEntity extends EntityKeys> {
    headerGroups: TanStackHeaderGroup<EntityData<TEntity>>[];
}


// Component Props for Modals and Forms
export interface ColumnSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    columns: EnhancedColumnDef<any>[]; // Updated to support TanStack Table ColumnDef
    visibleColumns: string[];
    setVisibleColumns: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface DialogFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'add' | 'edit' | 'delete' | 'view';
    columns: EnhancedColumnDef<any>[]; // Using TanStack Table ColumnDef
    data: TableData | null;
    onAction: (action: string, formData?: Record<string, string>) => void;
}


// Enhanced Table Body and Header for TanStack Table
export interface MatrxTableBodyProps<TEntity extends EntityKeys> {
    page: TanStackRow<EntityData<TEntity>>[];
    prepareRow: (row: TanStackRow<EntityData<TEntity>>) => void;
    truncateAt?: number;
    actionList?: string[];
    onAction: (actionName: string, rowData: EntityData<TEntity>) => void;
    visibleColumns: string[];
    customModalContent?: (rowData: EntityData<TEntity>) => React.ReactNode;
}


// export interface CustomTableCellProps<TEntity extends EntityKeys> {
//     cell: TanStackCell<EntityData<TEntity>, unknown>;
//     truncateAt?: number;
//     rowData: EntityData<TEntity>;
//     actions: MatrxCommand<TEntity>[]; // Full action definitions list
//     onAction: (action: MatrxCommand<TEntity>, rowData: EntityData<TEntity>) => void; // Pass action definition
// }
//
//
// export interface EntityActionButtonProps<TEntity extends EntityKeys> {
//     action: MatrxCommand<TEntity>;
//     entityData: EntityData<TEntity>;
//     entityKey: TEntity;
//     className?: string;
//     onActionOverride?: (action: MatrxCommand<TEntity>, entityData: EntityData<TEntity>) => void; // Optional custom handler
// }

export interface EntityActionGroupProps<TEntity extends EntityKeys> {
    actionNames: string[];
    entityData: EntityData<TEntity>;
    entityKey: TEntity;
    className?: string;
    customActions?: ActionDefinition<TEntity>[]; // Optional list of custom actions
    actionOverrides?: Record<string, (action: ActionDefinition<TEntity>, entityData: EntityData<TEntity>) => void>; // Optional handlers for specific actions
}

// Base Action Definition
export interface ActionDefinition<TEntity extends EntityKeys = any> {
    name: string;
    label: string;
    icon: React.ReactNode;
    type: 'entity' | 'feature' | 'module' | 'service' | 'navigation' | 'custom';
    subType?: 'single' | 'relationship' | 'custom';

    handler?: (context: ActionContext<TEntity>) => void | Promise<void>;
    overrideHandler?: (context: ActionContext<TEntity>) => void | Promise<void>;

    className?: string | ((data: EntityData<TEntity>) => string);

    isVisible?: (data: EntityData<TEntity>) => boolean;
    isEnabled?: (data: EntityData<TEntity>) => boolean;

    confirmationRequired?: boolean | {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
    };
    relationship?: {
        entityKey: EntityKeys;
        display: 'modal' | 'sidebar' | 'page' | 'inline';
    };
    navigation?: {
        path: string;
        params?: Record<string, string>;
    };
    service?: {
        type: 'socket' | 'api' | 'ai';
        action: string;
    };
}


