'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createEntitySelectors } from "@/lib/redux/entity/entitySelectors";
import { createEntityActions } from "@/lib/redux/entity/entityActionCreator";
import { RootState } from '@/lib/redux/store';
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";

const entityKey = 'registeredFunction';
const selectors = createEntitySelectors(entityKey);
const actions = createEntityActions(entityKey);

const TestEntityTable: React.FC = () => {
    const dispatch = useDispatch();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [visibleColumns, setVisibleColumns] = useState<string[]>([]); // Handles dynamic column visibility

    const data = useSelector((state: RootState) => selectors.getData(state));
    const loading = useSelector((state: RootState) => selectors.getLoading(state));
    const error = useSelector((state: RootState) => selectors.getError(state));
    const totalCount = useSelector((state: RootState) => selectors.getTotalCount(state));
    const initialized = useSelector((state: RootState) => selectors.getInitialized(state));

    // Fetch data when page, pageSize, or searchQuery changes
    const fetchData = useCallback(() => {
        dispatch(actions.fetchPaginatedRequest({
            page,
            pageSize,
            options: { query: searchQuery }, // Adding search to options for server-side handling
            maxCount: 10000
        }));
    }, [dispatch, page, pageSize, searchQuery]);

    // Handle page and search changes from the table
    const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
        setPage(newPage);
        setPageSize(newPageSize);
    }, []);

    const handleSearchChange = useCallback((query: string) => {
        setSearchQuery(query);
        setPage(1); // Reset to page 1 on new search
    }, []);

    const handleColumnVisibilityChange = useCallback((newVisibleColumns: string[]) => {
        setVisibleColumns(newVisibleColumns);
    }, []);

    const handleAction = (action: string, row: any) => {
        console.log("Action triggered:", action, "on row:", row);
        // Additional action handling logic here, e.g., opening a modal or navigating to a detail view
    };

    // Fetch data on initial load or when dependencies change
    useEffect(() => {
        if (!initialized && !loading) {
            fetchData();
        }
    }, [initialized, loading, fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const memoizedData = useMemo(() => data, [data]);
    const memoizedTotalCount = useMemo(() => totalCount, [totalCount]);

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-bold">Test Entity Table</h1>

            {loading && <div>Loading...</div>}

            {error && (
                <div className="text-destructive p-4 rounded">
                    Error: {error}
                </div>
            )}

            {!loading && memoizedData && (
                <div className="space-y-4">
                    <MatrxTable
                        data={memoizedData}
                        actions={['view', 'edit', 'delete']}
                        onAction={handleAction} // Trigger row actions
                        truncateAt={50}
                        onPageChange={handlePageChange}
                        onSearchChange={handleSearchChange} // Search handler
                        onVisibleColumnsChange={handleColumnVisibilityChange} // Dynamic column visibility
                        currentPage={page}
                        pageSize={pageSize}
                        totalCount={memoizedTotalCount}
                        loading={loading}
                        defaultVisibleColumns={visibleColumns} // Start with specified columns
                    />

                    {memoizedTotalCount !== undefined && (
                        <div className="text-muted-foreground text-sm">
                            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, memoizedTotalCount)} of {memoizedTotalCount} entries
                        </div>
                    )}
                </div>
            )}

            <pre className="mt-4 p-4 bg-background rounded border">
                {JSON.stringify({
                    page,
                    pageSize,
                    searchQuery,
                    visibleColumns,
                    initialized,
                    totalCount: memoizedTotalCount,
                    dataLength: memoizedData?.length,
                    loading,
                    error,
                }, null, 2)}
            </pre>
        </div>
    );
};

export default TestEntityTable;
