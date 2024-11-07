// components/table/BaseTable.tsx
import React from "react";
import {EntityKeys} from "@/types/entityTypes";
import {useDataTable} from "@/components/matrx/Entity/hooks/useDataTable";
import {DefaultTable} from "@/components/matrx/Entity/DataTable/variants/DefaultTable";
import {buildColumnsFromTableColumns} from "@/components/matrx/Entity/addOns/tableBuilder";
import {ColumnFiltersState, useReactTable, getCoreRowModel, getFilteredRowModel} from "@tanstack/react-table";
import {TableFilter} from "../addOns/TableFilter";

import {useEntity} from "@/lib/redux/entity/useEntity";

const DEFAULT_PAGE_SIZE = 10;

export interface DataTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    variant?: 'default' | 'compact' | 'cards' | 'minimal';
    options?: {
        showCheckboxes?: boolean; // default true
        showFilters?: boolean; // default true
        showActions?: boolean; // default true
        actions?: {
            showEdit?: boolean; // default true
            showDelete?: boolean; // default true
            showExpand?: boolean; // default true
            custom?: Array<{
                label: string;
                onClick: (row: any) => void;
                variant?: "outline" | "destructive";
                size?: "xs" | "sm";
            }>;
        };
    };
}

export function DataTable<TEntity extends EntityKeys>(
    {
        entityKey,
        variant = 'default',
        options = {
            showCheckboxes: true,
            showFilters: true,
            showActions: true,
            actions: {
                showEdit: true,
                showDelete: true,
                showExpand: true
            }
        }
    }: DataTableProps<TEntity>) {
    const {
        matrxTableData,
        // ... other useful things from useEntity
    } = useEntity(entityKey);

    // Add default columns (checkbox and actions) to the existing columns
    const enhancedColumns = React.useMemo(() => {
        let columns = [...matrxTableData.columns];

        if (options.showCheckboxes) {
            columns.unshift({
                id: 'select',
                // ... your checkbox column definition
            });
        }

        if (options.showActions) {
            columns.push({
                id: 'actions',
                // ... your actions column definition
            });
        }

        return columns;
    }, [matrxTableData.columns, options]);

    // Enhanced table configuration
    const tableConfig = {
        ...matrxTableData.config,
        columns: enhancedColumns,
    };

    return (
        <div className="space-y-4">
            {options.showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Filter row */}
                </div>
            )}

            <DefaultTable
                {...matrxTableData}
                config={tableConfig}
            />
        </div>
    );
}




export function DataTable2<TEntity extends EntityKeys>(
    {
        entityKey,
        variant = 'default',
        defaultColumns,
        additionalActions
    }: DataTableProps<TEntity>) {
    const tableProps = useDataTable(entityKey);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

    const enhancedColumns = React.useMemo(() =>
            buildColumnsFromTableColumns<TEntity>(
                defaultColumns || tableProps.tableColumns,
                [
                    ...(additionalActions?.map(action => ({
                        type: "actions" as const,
                        options: {
                            actions: [{
                                ...action,
                                variant: action.variant || "outline",
                                size: action.size || "xs"
                            }]
                        }
                    })) || [])
                ]
            ),
        [tableProps.tableColumns, defaultColumns, additionalActions]
    );

    const table = useReactTable({
        ...tableProps.table.options,
        columns: enhancedColumns,
        state: {
            ...tableProps.table.options.state,
            columnFilters,
        },
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const enhancedProps = {
        ...tableProps,
        table,
        columns: enhancedColumns,
    };

    return (
        <div className="space-y-4">
            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {table.getHeaderGroups().map(headerGroup =>
                    headerGroup.headers.map(header => {
                        if (!header.column.getCanFilter()) return null;
                        return (
                            <div key={header.id} className="space-y-1">
                                <label className="text-sm font-medium">
                                    {header.column.columnDef.header as string}
                                </label>
                                <TableFilter column={header.column}/>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Table Component */}
            <DefaultTable {...enhancedProps} />
        </div>
    );
}
