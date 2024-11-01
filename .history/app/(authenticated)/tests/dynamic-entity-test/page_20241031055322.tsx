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
    const [shouldFetch, setShouldFetch] = useState(true);

    const data = useSelector((state: RootState) => selectors.getData(state));
    const loading = useSelector((state: RootState) => selectors.getLoading(state));
    const error = useSelector((state: RootState) => selectors.getError(state));
    const totalCount = useSelector((state: RootState) => selectors.getTotalCount(state));
    const initialized = useSelector((state: RootState) => selectors.getInitialized(state));

    const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
        setPage(newPage);
        setPageSize(newPageSize);
        setShouldFetch(true);
    }, []);

    useEffect(() => {
        if (shouldFetch) {
            console.log('TestEntityTable Fetching data:', { page, pageSize });
            dispatch(actions.fetchPaginatedRequest(page, pageSize, ));
            setShouldFetch(false);
        }
    }, [page, pageSize, shouldFetch]);

    useEffect(() => {
        if (!initialized && !loading) {
            setShouldFetch(true);
        }
    }, []);

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
                    shouldFetch
                }, null, 2)}
            </pre>
        </div>
    );
};

export default TestEntityTable;
