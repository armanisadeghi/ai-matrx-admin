"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender, TableOptions,
    useReactTable,
} from "@tanstack/react-table"
import {ChevronDown, EditIcon, TrashIcon} from "lucide-react"
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip"

import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {Input} from "@/components/ui/input"
import {useEntity} from "@/lib/redux/entity/useEntity"
import {EntityKeys, EntityData} from "@/types/entityTypes"
import {Spinner} from "@nextui-org/spinner";
import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert"
import {buildColumnsFromTableColumns} from "@/components/matrx/Entity/addOns/tableBuilder";
import {useMemo} from "react";
import {ActionColumnOptions} from "@/components/matrx/Entity/addOns/columnDefinitions";

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
                onClick: (row: EntityData<TEntity>) => void;
                variant?: "outline" | "destructive";
                size?: "xs" | "sm";
            }>;
        };
    };
}

const DEFAULT_OPTIONS = {
    showCheckboxes: true,
    showFilters: true,
    showActions: true,
    actions: {
        showEdit: true,
        showDelete: true,
        showExpand: true,
    }
};

export function DataTable<TEntity extends EntityKeys>(
    {
        entityKey,
        options = DEFAULT_OPTIONS
    }: DataTableProps<TEntity>) {
    const {
        loadingState,
        paginationInfo,
        matrxTableData: {
            config,
            state: tableState,
            utils: tableUtils,
            defaultPageSize,
        }
    } = useEntity(entityKey);

    React.useEffect(() => {
        config.onPaginationChange?.({
            pageIndex: 0,
            pageSize: defaultPageSize
        });
    }, [entityKey]);

    const columnsWithActions = React.useMemo(() => {
        const baseColumns = (config.columns || []).map(col => ({
            key: col.id,
            title: String(col.header)
        }));

        const actionButtons = [];
        if (options.showActions) {
            if (options.actions?.showEdit) {
                actionButtons.push({
                    id: "edit",
                    label: "Edit",
                    onClick: (row) => console.log("Edit", row),
                    variant: "outline",
                    size: "xs"
                });
            }

            if (options.actions?.showDelete) {
                actionButtons.push({
                    id: "delete",
                    label: "Delete",
                    onClick: (row) => console.log("Delete", row),
                    variant: "destructive",
                    size: "xs"
                });
            }
            if (options.actions?.showExpand) {
                actionButtons.push({
                    id: "expand",
                    label: "Expand",
                    onClick: (row) => console.log("Expand", row),
                    variant: "primary",
                    size: "xs"
                });
            }


            if (options.actions?.custom) {
                actionButtons.push(...options.actions.custom);
            }
        }

        return buildColumnsFromTableColumns<TEntity>(
            baseColumns,
            actionButtons.length > 0
            ? [{
                    type: "actions",
                    options: {
                        actions: actionButtons,
                        containerClassName: "justify-end"
                    }
                }]
            : []
        );
    }, [config.columns, options]);

    const tableConfig = useMemo(() => {
        return {
            ...config,
            columns: columnsWithActions,
            data: config.data || [],
            state: {
                ...config.state,
                globalFilter: tableState.globalFilter,
            },
        } as TableOptions<EntityData<TEntity>>;
    }, [config, columnsWithActions, tableState.globalFilter]);

    const table = useReactTable(tableConfig);

    return (
        <div className="relative w-full">
            {loadingState.loading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
                    <div className="flex items-center gap-2">
                        <Spinner size="lg" label="Loading..." color="primary" labelColor="primary"/>
                    </div>
                </div>
            )}
            {loadingState.error && (
                <div className="p-4 text-destructive">
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {loadingState.error.message}
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {options.showFilters && (
                <div className="flex items-center justify-between py-4">
                    <Input
                        placeholder="Search all fields..."
                        className="max-w-sm"
                        value={tableState.globalFilter}
                        onChange={(e) => tableUtils.setGlobalFilter(e.target.value)}
                    />

                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    Columns <ChevronDown className="ml-2 h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanHide())
                                    .map((column) => {
                                        return (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) =>
                                                    column.toggleVisibility(!!value)
                                                }
                                            >
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
                                        )
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            )}

            <div className="rounded-md border flex-1 overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                         ? null
                                         : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                 <TableCell
                                     colSpan={columnsWithActions.length}
                                     className="h-24 text-center"
                                 >
                                     No results.
                                 </TableCell>
                             </TableRow>
                         )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Rows per page: {paginationInfo.pageSize} <ChevronDown className="ml-2 h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {[5, 10, 25, 50, 100].map((size) => (
                                <DropdownMenuItem
                                    key={size}
                                    onSelect={() => config.onPaginationChange?.({
                                        pageIndex: 0,
                                        pageSize: size
                                    })}
                                >
                                    {size}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <span className="text-sm text-muted-foreground">
                        Showing {((paginationInfo.page - 1) * paginationInfo.pageSize) + 1} to{" "}
                        {Math.min(paginationInfo.page * paginationInfo.pageSize, paginationInfo.totalCount)} of{" "}
                        {paginationInfo.totalCount} entries
                    </span>
                </div>

                <div className="flex items-center space-x-6">
                    <span className="text-sm text-muted-foreground">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected
                    </span>

                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => config.onPaginationChange?.({
                                pageIndex: paginationInfo.page - 2,
                                pageSize: paginationInfo.pageSize
                            })}
                            disabled={!paginationInfo.hasPreviousPage}
                        >
                            Previous
                        </Button>

                        <span className="text-sm font-medium">
                            Page {paginationInfo.page} of {paginationInfo.totalPages}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => config.onPaginationChange?.({
                                pageIndex: paginationInfo.page,
                                pageSize: paginationInfo.pageSize
                            })}
                            disabled={!paginationInfo.hasNextPage}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DataTable
