"use client"

import * as React from "react"
import {
    ColumnSizingState,
    VisibilityState,
    useReactTable,
    flexRender,
    RowSelectionState,
    GroupingState,
    SortingState,
    getSortedRowModel,
} from "@tanstack/react-table"

import {
    ChevronsUpDown,
    Settings2,
    SlidersHorizontal,
    Group,
    ChevronFirst,
    ChevronLast,
} from "lucide-react"
import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
import {
    TableOptions,
    ValueFormattingOptions,
    ActionConfig,
    SmartFieldConfig,
    TableDensity,
    TableState, getColumnMeta,
} from "@/components/matrx/Entity/types/advancedDataTableTypes";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {cn} from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {Checkbox} from "@/components/ui/checkbox"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Separator} from "@/components/ui/separator"

export interface AdvancedDataTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity
    variant?: 'default' | 'compact' | 'cards' | 'minimal'
    options?: Partial<TableOptions>
    formatting?: ValueFormattingOptions
    smartFields?: SmartFieldConfig
    actions?: ActionConfig
    onAction?: (action: string, row: EntityData<TEntity>) => void
}

const densityConfig: Record<TableDensity, string> = {
    compact: "p-1",
    normal: "p-3",
    comfortable: "p-4"
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
    const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
    const [grouping, setGrouping] = React.useState<GroupingState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
    const [density, setDensity] = React.useState<TableDensity>('normal')
    const [sorting, setSorting] = React.useState<SortingState>([])


    const {
        loadingState,
        paginationInfo,
        tableState,
        tableConfig,
        tableUtils,
        options: mergedOptions
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

    const table = useReactTable<EntityData<TEntity>>({
        ...tableConfig,
        state: {
            ...tableConfig.state,
            columnSizing,
            columnVisibility,
            rowSelection,
            grouping,
            density,
        },
        enableColumnResizing: true,
        columnResizeMode: "onChange",
        onColumnSizingChange: setColumnSizing,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGroupingChange: setGrouping,
        debugTable: true,
    })




    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedRow(null)
    }

    const renderToolbar = () => {
        if (!mergedOptions.showToolbar) return null;

        return (
            <div className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-2">
                    {mergedOptions.showGlobalFilter && (
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Search all columns..."
                                value={tableState.globalFilter ?? ''}
                                onChange={(e) => table.setGlobalFilter(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {mergedOptions.enableGrouping && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Group className="h-4 w-4 mr-2"/>
                                                Group
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent align="end" className="w-[200px]">
                                            <div className="space-y-2">
                                                <h4 className="font-medium leading-none">Grouping</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Select columns to group by
                                                </p>
                                                <Separator/>
                                                <ScrollArea className="h-[300px]">
                                                    {table
                                                        .getAllColumns()
                                                        .filter(column => column.getCanGroup())
                                                        .map(column => (
                                                            <div
                                                                key={column.id}
                                                                className="flex items-center space-x-2"
                                                            >
                                                                <Checkbox
                                                                    checked={column.getIsGrouped()}
                                                                    onCheckedChange={() => column.toggleGrouping()}
                                                                />
                                                                <label className="text-sm">
                                                                    {column.id}
                                                                </label>
                                                            </div>
                                                        ))}
                                                </ScrollArea>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Group rows by column</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {mergedOptions.showColumnVisibility && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Settings2 className="h-4 w-4 mr-2"/>
                                                Columns
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[200px]">
                                            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                                            <DropdownMenuSeparator/>
                                            <ScrollArea className="h-[300px]">
                                                {table
                                                    .getAllColumns()
                                                    .filter(column => column.getCanHide())
                                                    .map(column => (
                                                        <DropdownMenuCheckboxItem
                                                            key={column.id}
                                                            className="capitalize"
                                                            checked={column.getIsVisible()}
                                                            onCheckedChange={(value) => {
                                                                column.toggleVisibility(!!value)
                                                            }}
                                                        >
                                                            {column.id}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                            </ScrollArea>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Show/hide columns</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {mergedOptions.density && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <SlidersHorizontal className="h-4 w-4 mr-2"/>
                                                Density
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => setDensity('compact')}
                                            >
                                                Compact
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setDensity('normal')}
                                            >
                                                Normal
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => setDensity('comfortable')}
                                            >
                                                Comfortable
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Adjust row spacing</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>
        )
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

            {/* Toolbar */}
            {renderToolbar()}

            {/* Main Table */}
            <div className={cn(
                "rounded-md border",
                variant === 'cards' ? 'border-none' : '',
                "relative"
            )}>
                <Table className={cn(
                    variant === 'minimal' ? 'border-none' : '',
                    mergedOptions.enableColumnResizing ? 'table-fixed' : '',
                )}>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id}>
                                {/* Checkbox Column */}
                                {mergedOptions.showCheckboxes && (
                                    <TableHead className="w-[40px] p-0">
                                        <Checkbox
                                            checked={table.getIsAllPageRowsSelected()}
                                            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                                            aria-label="Select all rows"
                                            className="ml-4"
                                        />
                                    </TableHead>
                                )}

                                {/* Data Columns */}
                                {headerGroup.headers.map(header => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "relative",
                                            header.column.getCanSort() ? "cursor-pointer select-none" : "",
                                            header.column.getCanResize() ? "resize-x" : ""
                                        )}
                                        style={{
                                            width: header.getSize(),
                                        }}
                                    >
                                        {header.isPlaceholder ? null : (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={cn(
                                                        "flex items-center gap-2",
                                                        header.column.getCanSort() ? "cursor-pointer" : ""
                                                    )}
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    {typeof header.column.columnDef.header === 'string' ? (
                                                        header.column.columnDef.header
                                                    ) : (
                                                         flexRender(
                                                             header.column.columnDef.header,
                                                             header.getContext()
                                                         )
                                                     )}
                                                    {header.column.getCanSort() && (
                                                        <ChevronsUpDown className="h-4 w-4"/>
                                                    )}
                                                </div>
                                                {header.column.getCanFilter() && (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                <SlidersHorizontal className="h-4 w-4"/>
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent align="start" className="w-[200px]">
                                                            <div className="space-y-2">
                                                                {header.column.columnDef.header && (
                                                                    <h4 className="font-medium leading-none">
                                                                        Filter {typeof header.column.columnDef.header === 'string'
                                                                                ? header.column.columnDef.header
                                                                                : 'Column'}
                                                                    </h4>
                                                                )}
                                                                <Input
                                                                    placeholder={`Filter ${String(header.column.columnDef.header)}...`}
                                                                    value={header.column.getFilterValue() as string ?? ""}
                                                                    onChange={(e) => header.column.setFilterValue(e.target.value)}
                                                                    className="max-w-sm"
                                                                />
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                            </div>
                                        )}
                                        {header.column.getCanResize() && (
                                            <div
                                                className={cn(
                                                    "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none",
                                                    header.column.getIsResizing() ? "bg-primary" : "bg-border"
                                                )}
                                                onMouseDown={header.getResizeHandler()}
                                                onTouchStart={header.getResizeHandler()}
                                            />
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
                                    className={cn(
                                        densityConfig[density || 'normal'],
                                        row.getIsSelected() ? "bg-muted/50" : ""
                                    )}
                                >
                                    {/* Checkbox Column */}
                                    {mergedOptions.showCheckboxes && (
                                        <TableCell className={cn(
                                            "p-0",
                                            densityConfig[density || 'normal']
                                        )}>
                                            <Checkbox
                                                checked={row.getIsSelected()}
                                                onCheckedChange={(value) => row.toggleSelected(!!value)}
                                                aria-label="Select row"
                                                className="ml-4"
                                            />
                                        </TableCell>
                                    )}

                                    {/* Data Cells */}
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn(
                                                "overflow-hidden text-ellipsis",
                                                densityConfig[density || 'normal'], // Add this line
                                                getColumnMeta(cell.column.columnDef)?.align === 'right' ? "text-right" : "",
                                                getColumnMeta(cell.column.columnDef)?.align === 'center' ? "text-center" : ""
                                            )}
                                        >
                                            {mergedOptions.showTooltips ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="truncate">
                                                                {flexRender(
                                                                    cell.column.columnDef.cell,
                                                                    cell.getContext()
                                                                )}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                 flexRender(
                                                     cell.column.columnDef.cell,
                                                     cell.getContext()
                                                 )
                                             )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                             <TableRow>
                                 <TableCell
                                     colSpan={table.getAllColumns().length + (mergedOptions.showCheckboxes ? 1 : 0)}
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
            {mergedOptions.showPagination && (
                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                        <Select
                            value={String(table.getState().pagination.pageSize)}
                            onValueChange={(value) => {
                                const newSize = Number(value)
                                table.setPageSize(newSize)
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select rows per page"/>
                            </SelectTrigger>
                            <SelectContent>
                                {(mergedOptions.defaultPageSizeOptions).map((pageSize) => (
                                    <SelectItem key={pageSize} value={String(pageSize)}>
                                        {pageSize} rows per page
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="text-sm text-muted-foreground">
                            Showing {((paginationInfo.page - 1) * paginationInfo.pageSize) + 1} to{" "}
                            {Math.min(paginationInfo.page * paginationInfo.pageSize, paginationInfo.totalCount)} of{" "}
                            {paginationInfo.totalCount} entries
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        {mergedOptions.showCheckboxes && (
                            <span className="text-sm text-muted-foreground">
                                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                                {table.getFilteredRowModel().rows.length} row(s) selected
                            </span>
                        )}

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronFirst className="h-4 w-4"/>
                            </Button>
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <ChevronLast className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdvancedDataTable
