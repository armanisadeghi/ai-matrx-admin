"use client"

import * as React from "react"
import {flexRender, useReactTable,} from "@tanstack/react-table"
import {ChevronDown} from "lucide-react"
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
import {EntityKeys, EntityData} from "@/types/entityTypes"
import {Spinner} from "@heroui/spinner";
import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert"
import {buildColumnsFromTableColumns} from "@/components/matrx/Entity/addOns/tableBuilder";
import {EntityTabModal} from "@/components/matrx/Entity";
import {generateStandardTabData} from "@/components/matrx/Entity/utils/tableHelpers";
import {createDefaultTableActions} from '@/components/matrx/Entity/action/defaultActions';
import {useEntityDataTable} from "@/components/matrx/Entity/hooks/useEntityDataTable";

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

export const DEFAULT_OPTIONS = {
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
            tanstackConfig,
            tableState,
            tanstackColumns,
            tanstackUtils,
            columnUtils,
            defaults,
        }
    } = useEntityDataTable(entityKey);

    React.useEffect(() => {
        tanstackConfig.onPaginationChange?.({
            pageIndex: 0,
            pageSize: defaults.defaultPageSize
        });
    }, [entityKey]);

    // Modal state
    const [selectedRow, setSelectedRow] = React.useState<EntityData<TEntity> | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<string>('view');

    const handleAction = React.useCallback((actionName: string, rowData: EntityData<TEntity>) => {
        setSelectedRow(rowData);
        setActiveTab(actionName);
        setIsModalOpen(true);
    }, [setSelectedRow, setActiveTab, setIsModalOpen]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRow(null);
    };

    const defaultActions = React.useMemo(() =>
            createDefaultTableActions(handleAction)
        , [handleAction]);

    const columnsWithActions = React.useMemo(() => {
        const baseColumns = (tanstackConfig.columns || []).map(col => ({
            key: col.id,
            title: String(col.header)
        }));

        return buildColumnsFromTableColumns<TEntity>(
            baseColumns,
            options.showActions ? [defaultActions.expanded] : []
        );
    }, [tanstackConfig.columns, options.showActions, defaultActions.expanded]);

    const table = useReactTable({
        ...tanstackConfig,
        columns: columnsWithActions,
        data: tanstackConfig.data || [],
        state: {
            ...tanstackConfig.state,
            columnVisibility: tableState.columnVisibility,
            globalFilter: tableState.globalFilter,
        },
        onColumnVisibilityChange: tanstackConfig.onColumnVisibilityChange,
        onGlobalFilterChange: tanstackConfig.onGlobalFilterChange,
    });

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
                        onChange={(e) => table.setGlobalFilter(e.target.value)}
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
                                                onCheckedChange={(value) => column.toggleVisibility(!!value)}
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
            {selectedRow && isModalOpen && (
                <EntityTabModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    tabs={generateStandardTabData(
                        selectedRow,
                        setActiveTab,
                        setIsModalOpen,
                        selectedRow,
                        handleAction
                    )}
                    activeTab={activeTab}
                    formState={selectedRow}
                    title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item`}
                    description={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} item details`}
                    onTabChange={setActiveTab}
                    isSinglePage={true}
                />
            )}

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
                                    onSelect={() => tanstackConfig.onPaginationChange?.({
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
                            onClick={() => tanstackConfig.onPaginationChange?.({
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
                            onClick={() => tanstackConfig.onPaginationChange?.({
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
