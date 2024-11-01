'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { createEntitySelectors } from "@/lib/redux/entity/entitySelectors";
import { createEntityActions } from "@/lib/redux/entity/entityActionCreator";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";

// Create selectors and actions once, outside the component
const entityKey = 'registeredFunction';
const entitySelectors = createEntitySelectors(entityKey);
const entityActions = createEntityActions(entityKey);

const TestEntityTable: React.FC = () => {
    const dispatch = useAppDispatch();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Use typed selector hooks
    const data = useAppSelector(entitySelectors.selectData);
    const loading = useAppSelector(entitySelectors.selectLoading);
    const error = useAppSelector(entitySelectors.selectError);
    const totalCount = useAppSelector(entitySelectors.selectTotalCount);
    const initialized = useAppSelector(entitySelectors.selectInitialized);

    // Add some debugging logs
    useEffect(() => {
        console.log('Current entity state:', {
            data,
            loading,
            error,
            totalCount,
            initialized
        });
    }, [data, loading, error, totalCount, initialized]);

    const fetchData = useCallback(() => {
        dispatch(entityActions.fetchPaginatedRequest({
            page,
            pageSize,
            options: {},
            maxCount: 10000
        }));
    }, [dispatch, page, pageSize]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!initialized && !loading) {
            fetchData();
        }
    }, [initialized, loading, fetchData]);

    const memoizedData = useMemo(() => data, [data]);
    const memoizedTotalCount = useMemo(() => totalCount, [totalCount]);

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-bold">Test Entity Table</h1>

            {loading && <div>Loading...</div>}

            {error?.message && (
                <div className="text-destructive p-4 rounded">
                    Error: {error.message}
                </div>
            )}

            {!loading && memoizedData && (
                <div className="space-y-4">
                    <MatrxTable
                        data={memoizedData}
                        actions={['view']}
                        onAction={(action, row) => console.log(action, row)}
                        truncateAt={50}
                        onPageChange={handlePageChange}
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