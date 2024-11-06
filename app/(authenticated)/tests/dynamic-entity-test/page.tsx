'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
// import {createEntityActions} from "@/lib/redux/entity/entityActionCreator";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import MatrxTable from "@/app/(authenticated)/tests/matrx-table/components/MatrxTable";

const entityKey = 'registeredFunction';
const entitySelectors = createEntitySelectors(entityKey);
const entityActions = createEntityActions(entityKey);

const TestEntityTable: React.FC = () => {
    const dispatch = useAppDispatch();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const data = useAppSelector(entitySelectors.selectData);
    const loading = useAppSelector(entitySelectors.selectLoading);
    const error = useAppSelector(entitySelectors.selectError);
    const totalCount = useAppSelector(entitySelectors.selectTotalCount);
    const initialized = useAppSelector(entitySelectors.selectInitialized);

    // Combine fetch logic into a single effect with clear conditions
    useEffect(() => {
        // Only fetch if:
        // 1. We're not currently loading
        // 2. AND either we're not initialized OR we have an explicit page change
        if (!loading && (!initialized || page > 0)) {
            dispatch(entityActions.fetchPaginatedRequest({
                page,
                pageSize,
                options: {},
                maxCount: 10000
            }));
        }
    }, [page, pageSize]);

    const handlePageChange = useCallback((newPage: number) => {
        console.log('Page changed to:', newPage);
        setPage(newPage);
    }, []);

    // Memoize data only if you're using it in expensive computations
    const memoizedData = data;
    const memoizedTotalCount = totalCount;

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
