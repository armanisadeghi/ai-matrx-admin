// hooks/useDataTable.ts
import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { useEntity } from "@/lib/redux/entity/useEntity"
import { EntityKeys, EntityData } from "@/types/entityTypes"
import { Draft } from 'immer'

export const DEFAULT_PAGE_SIZE = 10

export function useDataTable<TEntity extends EntityKeys>(entityKey: TEntity) {
    const {
        tableColumns,
        paginationInfo,
        currentPage,
        fetchRecords,
        setFilters,
        setSorting,
        loadingState,
        setSelection,
    } = useEntity(entityKey)

    // Initialize with default page size
    React.useEffect(() => {
        fetchRecords(1, DEFAULT_PAGE_SIZE)
    }, [entityKey, fetchRecords])

    const [sorting, setSortingState] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")

    const globalFilterFn = React.useCallback(
        (row: any, columnId: string, filterValue: string) => {
            const searchableValues = Object.values(row.original).join(" ").toLowerCase()
            return searchableValues.includes(filterValue.toLowerCase())
        },
        []
    )

    const pageSizeOptions = [5, 10, 25, 50, 100]

    const handlePageSizeChange = (newSize: number) => {
        fetchRecords(1, newSize)
    }

    const columns = React.useMemo(() =>
            tableColumns.map(col => ({
                id: col.key,
                accessorKey: col.key,
                header: col.title,
                cell: ({ getValue }) => String(getValue()),
            } as ColumnDef<EntityData<TEntity>>)),
        [tableColumns]
    )

    const table = useReactTable({
        data: currentPage,
        columns: columns,
        onSortingChange: setSortingState,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: (updatedSelection) => {
            setRowSelection(updatedSelection)
            const selectedRows = table
                .getFilteredRowModel()
                .rows.filter((row) => updatedSelection[row.id])
                .map((row) => row.original as Draft<EntityData<TEntity>>)
            setSelection(selectedRows, 'multiple')
        },
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
            pagination: {
                pageIndex: Math.max(0, paginationInfo.page - 1),
                pageSize: paginationInfo.pageSize || DEFAULT_PAGE_SIZE,
            }
        },
        enableRowSelection: true,
        globalFilterFn,
        pageCount: paginationInfo.totalPages,
        manualPagination: true,
    })

    return {
        table,
        loadingState,
        paginationInfo,
        pageSizeOptions,
        globalFilter,
        setGlobalFilter,
        handlePageSizeChange,
        fetchRecords,
        tableColumns,
    }
}
