// components/table/DefaultTable.tsx
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {flexRender} from "@tanstack/react-table"

export function DefaultTable(
    {
        table,
        loadingState,
        paginationInfo,
        pageSizeOptions,
        globalFilter,
        setGlobalFilter,
        handlePageSizeChange,
        fetchRecords,
        columns,
    }) {
    return (
        <div className="relative w-full">
            {/* Table Controls */}
            <div className="flex items-center justify-between py-4">
                <Input
                    placeholder="Search all fields..."
                    className="max-w-sm"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                />
            </div>

            {/* Main Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
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
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                                 <TableCell colSpan={columns.length} className="h-24 text-center">
                                     No results.
                                 </TableCell>
                             </TableRow>
                         )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-4">
                    <select
                        value={paginationInfo.pageSize}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        className="h-8 rounded-md border bg-background px-2 text-sm"
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                Show {size}
                            </option>
                        ))}
                    </select>

                    <span className="text-sm text-muted-foreground">
                        Showing {((paginationInfo.page - 1) * paginationInfo.pageSize) + 1} to{" "}
                        {Math.min(paginationInfo.page * paginationInfo.pageSize, paginationInfo.totalCount)} of{" "}
                        {paginationInfo.totalCount} entries
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchRecords(paginationInfo.page - 1, paginationInfo.pageSize)}
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
                        onClick={() => fetchRecords(paginationInfo.page + 1, paginationInfo.pageSize)}
                        disabled={!paginationInfo.hasNextPage}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
