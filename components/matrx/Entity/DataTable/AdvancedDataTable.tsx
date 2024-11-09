"use client"

import * as React from "react"
import {flexRender, useReactTable} from "@tanstack/react-table"
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
import {Spinner} from "@nextui-org/spinner"
import {Alert, AlertTitle, AlertDescription} from "@/components/ui/alert"
import {EntityTabModal} from "@/components/matrx/Entity"
import {generateStandardTabData} from "@/components/matrx/Entity/utils/tableHelpers"
import {useAdvancedDataTable} from "@/components/matrx/Entity/hooks/useAdvancedDataTable"
import {SmartFieldConfig, ActionConfig} from "@/components/matrx/Entity/addOns/smartCellRender"

export interface FormattingConfig {
    nullValue: string
    undefinedValue: string
    emptyValue: string
    booleanFormat: {
        true: string
        false: string
    }
    numberFormat: {
        minimumFractionDigits: number
        maximumFractionDigits: number
    }
}

export interface AdvancedDataTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity
    variant?: 'default' | 'compact' | 'cards' | 'minimal'
    options?: {
        showCheckboxes?: boolean
        showFilters?: boolean
        showActions?: boolean
        enableSorting?: boolean
        enableGrouping?: boolean
        enableColumnResizing?: boolean
    }
    formatting?: FormattingConfig
    smartFields?: SmartFieldConfig
    actions?: ActionConfig
    onAction?: (action: string, row: EntityData<TEntity>) => void
}

export function AdvancedDataTable<TEntity extends EntityKeys>(
    {
        entityKey,
        variant = 'default',
        options = {},
        formatting,
        smartFields,
        actions,
        onAction
    }: AdvancedDataTableProps<TEntity>) {

    const [selectedRow, setSelectedRow] = React.useState<EntityData<TEntity> | null>(null)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [activeTab, setActiveTab] = React.useState<string>('view')

    const {
        loadingState,
        paginationInfo,
        tableState,
        tableConfig,
        tableUtils,
    } = useAdvancedDataTable({
        entityKey,
        options: {
            ...options,
            formatting,
            smartFields,
            actions,
        },
        onAction: (action, row) => {
            if (action === 'view' || action === 'edit' || action === 'delete') {
                setSelectedRow(row)
                setActiveTab(action)
                setIsModalOpen(true)
            }
            onAction?.(action, row)
        }
    })

    const table = useReactTable(tableConfig)

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedRow(null)
    }

    return (
        <div className="relative w-full">
            {/* Loading Overlay */}
            {loadingState.loading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
                    <Spinner size="lg" label="Loading..." color="primary" labelColor="primary"/>
                </div>
            )}

            {/* Error Display */}
            {loadingState.error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{loadingState.error.message}</AlertDescription>
                </Alert>
            )}

            {/* Table Controls */}
            {options.showFilters && (
                <div className="flex items-center justify-between py-4">
                    <Input
                        placeholder="Search all fields..."
                        className="max-w-sm"
                        value={tableState.globalFilter ?? ''}
                        onChange={(e) => tableUtils.setGlobalFilter(e.target.value)}
                    />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Columns <ChevronDown className="ml-2 h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table.getAllColumns()
                                .filter(column => column.getCanHide())
                                .map(column => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {/* Main Table */}
            <div className="rounded-md border flex-1 overflow-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null :
                                         flexRender(
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
                            table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map(cell => (
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
                                     colSpan={table.getAllColumns().length}
                                     className="h-24 text-center"
                                 >
                                     No results.
                                 </TableCell>
                             </TableRow>
                         )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal */}
            {selectedRow && isModalOpen && (
                <EntityTabModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    tabs={generateStandardTabData(
                        selectedRow,
                        setActiveTab,
                        setIsModalOpen,
                        selectedRow,
                        (action, row) => onAction?.(action, row)
                    )}
                    activeTab={activeTab}
                    formState={selectedRow}
                    title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item`}
                    description={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} item details`}
                    onTabChange={setActiveTab}
                    isSinglePage={true}
                />
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Rows per page: {paginationInfo.pageSize} <ChevronDown className="ml-2 h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {[5, 10, 25, 50, 100].map(size => (
                                <DropdownMenuItem
                                    key={size}
                                    onSelect={() => table.setPageSize(size)}
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
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>

                        <span className="text-sm font-medium">
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount()}
                        </span>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AdvancedDataTable
