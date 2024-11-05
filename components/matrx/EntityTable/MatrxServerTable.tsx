'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    useReactTable,
    ColumnDef,
} from '@tanstack/react-table';

import {Table} from "@/components/ui/table";
import MatrxTableHeader from "@/components/matrx/EntityTable/MatrxTableHeader";
import MatrxTableBody from "@/components/matrx/EntityTable/MatrxTableBody";
import {cn} from "@/styles/themes";
import TableTopOptions from "@/components/matrx/EntityTable/TableTopOptions";
import TableBottomSection from "@/components/matrx/EntityTable/TableBottomSection";
import MatrxColumnSettings from "@/components/matrx/EntityTable/MatrxColumnSettings";
import {EntityData, EntityKeys} from '@/types/entityTypes';
import {EntityCommandContext, EntityCommandName} from "@/components/matrx/MatrxCommands/EntityCommand";
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { selectFieldPrettyName } from '@/lib/redux/schema/globalCacheSelectors';
import {createEntitySelectors} from "@/lib/redux/entity/concepts/paramSelectors";

export interface MatrxServerTableProps<TEntity extends EntityKeys> {
    // Entity Configuration
    entityKey: TEntity;
    data: EntityData<TEntity>[];
    primaryKey: keyof EntityData<TEntity>;

    // Command Configuration
    commands?: {
        [key in EntityCommandName]?: boolean | {
        useCallback?: boolean;
        setActiveOnClick?: boolean;
        hidden?: boolean;
    };
    };

    // Command Callbacks
    onCommandExecute?: (
        actionName: EntityCommandName,
        context: EntityCommandContext<TEntity>
    ) => Promise<void>;

    // Modal Control
    onModalOpen?: (actionName: EntityCommandName, data: EntityData<TEntity>) => void;
    onModalClose?: () => void;

    // Table Configuration
    defaultVisibleColumns?: string[];
    truncateAt?: number;
    className?: string;
    customModalContent?: (rowData: EntityData<TEntity>) => React.ReactNode;

    // Server-side Configuration
    isServerSide?: boolean;
    loading?: boolean;
    totalCount?: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    serverPage?: number;
    serverPageSize?: number;
    columnHeaders?: Record<string, string>;
    displayField?: string;

    // Parent Control Props
    useParentModal?: boolean;
    useParentRowHandling?: boolean;
    useParentFormState?: boolean;
}


const generateColumns = <TEntity extends EntityKeys>(
    entityData: EntityData<TEntity>,
    primaryKey: keyof EntityData<TEntity>,
    columnHeaders?: Record<string, string>
): ColumnDef<EntityData<TEntity>>[] => {
    if (!entityData) return [];

    return Object.keys(entityData).map((key) => {
        if (key === 'actions') {
            return {
                id: 'actions',
                header: columnHeaders?.['actions'] || 'Actions',
                cell: () => null,
                enableSorting: false, // Disable sorting for actions column
            } as ColumnDef<EntityData<TEntity>>;
        }

        return {
            id: key,
            header: columnHeaders?.[key] || key.charAt(0).toUpperCase() + key.slice(1),
            accessorFn: (row: EntityData<TEntity>) => row[key as keyof EntityData<TEntity>],
            enableSorting: true, // Enable sorting for data columns
        } as ColumnDef<EntityData<TEntity>>;
    });
};
const getColumnId = <TEntity extends EntityKeys>(
    column: ColumnDef<EntityData<TEntity>>
): string => {
    if ('accessorKey' in column && typeof column.accessorKey === 'string') {
        return column.accessorKey;
    }
    return column.id || '';
};



const MatrxServerTable = <TEntity extends EntityKeys>(
    {
        entityKey,
        data,
        primaryKey,
        commands = {
            view: {useCallback: true},
            edit: {useCallback: true},
            delete: {useCallback: true},
            expand: {useCallback: true},
        },
        onCommandExecute,
        onModalOpen,
        onModalClose,
        defaultVisibleColumns = [],
        truncateAt,
        customModalContent,
        className,
        isServerSide = false,
        loading = false,
        totalCount = 0,
        onPageChange,
        onPageSizeChange,
        serverPage = 1,
        serverPageSize = 10,
        columnHeaders = {},
        displayField,
        useParentModal = false,
        useParentRowHandling = false,
        useParentFormState = false,
    }: MatrxServerTableProps<TEntity>) => {

    const dispatch = useAppDispatch();
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    const allData = useMemo(() => {
        return data.map((row, index) => ({
            ...row,
            _rowId: row[primaryKey] ? `${row[primaryKey]}` : `row-${index}`,
            // If there's a display field, add it as _displayValue for easier access
            ...(displayField && {_displayValue: row[displayField as keyof EntityData<TEntity>]})
        }));
    }, [data, primaryKey, displayField]);

    // Dynamically generate column definitions based on data keys
    const allColumns = useMemo(() => {
        if (allData.length === 0) return [];
        const entityData = allData[0];
        return generateColumns(entityData, primaryKey, columnHeaders);
    }, [allData, primaryKey, columnHeaders]);

    // Use pretty names for column names when available
    const allColumnNames = useMemo(() =>
            allColumns.map((col) => {
                const columnId = getColumnId(col);
                return columnHeaders[columnId] || (typeof col.header === 'string' ? col.header : '');
            }),
        [allColumns, columnHeaders]
    );

    const [visibleColumnAccessors, setVisibleColumnAccessors] = useState<string[]>(
        defaultVisibleColumns.length > 0 ? defaultVisibleColumns : allColumnNames
    );

    const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

    const handleCommandExecute = async (
        actionName: EntityCommandName,
        context: EntityCommandContext<TEntity>
    ) => {
        if (onCommandExecute) {
            await onCommandExecute(actionName, context);
        }

        // Handle modal opening if not controlled by parent
        if (!useParentModal && onModalOpen) {
            onModalOpen(actionName, context.data);
        }
    };

    // Update visible columns when defaults change
    useEffect(() => {
        if (allColumns.length > 0) {
            const newVisibleAccessors = allColumns
                .filter(column =>
                    typeof column.header === 'string' &&
                    defaultVisibleColumns.some(
                        (defaultCol) => {
                            const columnId = getColumnId(column);
                            const headerStr = column.header as string;
                            return defaultCol.toLowerCase() === headerStr.toLowerCase() ||
                                (columnId && defaultCol.toLowerCase() === columnId.toLowerCase());
                        }
                    )
                )
                .map(col => getColumnId(col));
            setVisibleColumnAccessors(newVisibleAccessors);
        }
    }, [allColumns, defaultVisibleColumns]);

    const visibleColumns = useMemo(
        () => allColumns.filter(column => {
            const columnId = getColumnId(column);
            return visibleColumnAccessors.includes(columnId);
        }),
        [allColumns, visibleColumnAccessors]
    );

    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [pagination, setPagination] = useState({
        pageIndex: serverPage - 1,
        pageSize: serverPageSize || 10,
    });

    const table = useReactTable({
        columns: visibleColumns,
        data: allData,
        state: {sorting, globalFilter, pagination},
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        manualPagination: isServerSide,
        pageCount: isServerSide ? Math.ceil(totalCount / pagination.pageSize) : undefined,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const handleNextPage = () => {
        if (table.getCanNextPage()) {
            table.nextPage();
            if (isServerSide && onPageChange) onPageChange(pagination.pageIndex + 2);
        }
    };

    const handlePreviousPage = () => {
        if (table.getCanPreviousPage()) {
            table.previousPage();
            if (isServerSide && onPageChange) onPageChange(pagination.pageIndex);
        }
    };

    const handleGotoPage = (pageIndex: number) => {
        table.setPageIndex(pageIndex);
        if (isServerSide && onPageChange) onPageChange(pageIndex + 1);
    };

    const handleSearchChange = (value: string) => {
        setGlobalFilter(value);
    };

    return (
        <div className={cn("p-3 space-y-4", className)}>
            <TableTopOptions
                columnNames={allColumnNames}
                handleSearchChange={handleSearchChange}
                pageSize={pagination.pageSize}
                setPageSize={(size) => {
                    table.setPageSize(size);
                    onPageSizeChange?.(size);
                }}
                handleAdd={() => {
                    handleCommandExecute('create', {
                        type: 'entity',
                        scope: 'single',
                        entityKey,
                        data: {} as EntityData<TEntity>,
                        index: -1,
                        dispatch,
                        selectors,
                    });
                }}
                setColumnSettingsOpen={setColumnSettingsOpen}
                columnSettingsOpen={columnSettingsOpen}
            />

            <div className="relative overflow-hidden shadow-md sm:rounded-lg scrollbar-hide">
                <div className="overflow-x-auto scrollbar-hide">
                    <div className="inline-block min-w-full align-middle scrollbar-hide">
                        <div className="overflow-hidden border rounded-xl bg-matrxBorder scrollbar-hide">
                            <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 scrollbar-hide">
                                <MatrxTableHeader headerGroups={table.getHeaderGroups()}/>
                                <MatrxTableBody
                                    entityKey={entityKey}
                                    page={table.getRowModel().rows}
                                    prepareRow={(row) => row.getVisibleCells()}
                                    commands={commands}
                                    onCommandExecute={handleCommandExecute}
                                    onModalOpen={onModalOpen}
                                    onModalClose={onModalClose}
                                    truncateAt={truncateAt}
                                    customModalContent={customModalContent}
                                    useParentModal={useParentModal}
                                    useParentRowHandling={useParentRowHandling}
                                    useParentFormState={useParentFormState}
                                    visibleColumns={visibleColumnAccessors}
                                />
                            </Table>
                        </div>
                    </div>
                </div>
            </div>

            <TableBottomSection
                currentPage={pagination.pageIndex + 1}
                pageNumbers={Array.from({length: table.getPageCount()}, (_, i) => i + 1)}
                canPreviousPage={table.getCanPreviousPage()}
                canNextPage={table.getCanNextPage()}
                previousPage={handlePreviousPage}
                nextPage={handleNextPage}
                gotoPage={handleGotoPage}
            />

            <MatrxColumnSettings
                open={columnSettingsOpen}
                onOpenChange={setColumnSettingsOpen}
                columns={allColumns}
                visibleColumns={visibleColumnAccessors}
                setVisibleColumns={setVisibleColumnAccessors}
                columnHeaders={columnHeaders}
            />
        </div>
    );
};

export default MatrxServerTable;
