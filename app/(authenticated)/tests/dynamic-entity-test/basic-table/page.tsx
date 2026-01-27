'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import {createEntitySelectors, getEntitySlice} from "@/lib/redux";
import {EntityKeys} from "@/types/entityTypes";

const entityKey: EntityKeys = 'registeredFunction';

const TestEntityTable: React.FC = () => {
    // Use selectors
    const dispatch = useAppDispatch();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [shouldFetch, setShouldFetch] = useState(true);

    console.log('Component rendering');

    // Create selectors and actions
    const selectors = useMemo(() => createEntitySelectors(entityKey), []);
    const actions = useMemo(() => getEntitySlice(entityKey).actions, []);

    const records = useAppSelector(selectors.selectAllRecords);
    const loadingState = useAppSelector(selectors.selectLoadingState);
    const error = useAppSelector(selectors.selectErrorState);
    const paginationInfo = useAppSelector(selectors.selectPaginationInfo);
    const internalLoading = useAppSelector(selectors.selectIsInternalLoading);

    // Convert records map to array
    const data = useMemo(() => {
        return Object.values(records);
    }, [records]);

    const loading = loadingState?.loading ?? false;
    const totalCount = paginationInfo?.totalCount ?? 0;
    const initialized = !internalLoading;
    // Handle page changes
    const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
        console.log('Page change:', { newPage, newPageSize });
        setPage(newPage);
        setPageSize(newPageSize);
        setShouldFetch(true);
    }, []);

    // Fetch effect
    useEffect(() => {
        if (shouldFetch) {
            console.log('Fetching data:', { page, pageSize });
            dispatch(actions.fetchRecords({ page, pageSize }));
            setShouldFetch(false);
        }
    }, [dispatch, page, pageSize, shouldFetch, actions]);

    // Get column headers from first data item
    const columns = data?.[0] ? Object.keys(data[0]) : [];

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-bold">Test Entity Table</h1>

            {loading && <div>Loading...</div>}

            {error && (
                <div className="text-destructive p-4 rounded">
                    Error: {error.message || String(error)}
                </div>
            )}

            {!loading && data && data.length > 0 && (
                <div className="space-y-4">
                    {/* Simple table */}
                    <div className="border rounded overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr className="bg-muted">
                                {columns.map(column => (
                                    <th key={column} className="p-2 text-left">
                                        {column}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-t">
                                    {columns.map(column => {
                                        const value = row[column as keyof typeof row];
                                        return (
                                            <td key={column} className="p-2">
                                                {typeof value === 'object' && value !== null
                                                 ? JSON.stringify(value)
                                                 : String(value ?? '')}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Simple pagination controls */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount ?? 0)} of {totalCount ?? 0} entries
                        </div>
                        <div className="space-x-2">
                            <button
                                onClick={() => handlePageChange(page - 1, pageSize)}
                                disabled={page === 1}
                                className="px-3 py-1 border rounded"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1">Page {page}</span>
                            <button
                                onClick={() => handlePageChange(page + 1, pageSize)}
                                disabled={page * pageSize >= (totalCount ?? 0)}
                                className="px-3 py-1 border rounded"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <pre className="mt-4 p-4 bg-background rounded border">
                {JSON.stringify({
                    page,
                    pageSize,
                    initialized,
                    totalCount,
                    dataLength: data.length,
                    loading,
                    error: error ? (error.message || String(error)) : null,
                    shouldFetch
                }, null, 2)}
            </pre>
        </div>
    );
};

export default TestEntityTable;
