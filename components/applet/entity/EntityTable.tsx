'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {createEntitySelectors} from "@/lib/redux/entity/entitySelectors";
import {createEntityActions} from "@/lib/redux/entity/entityActionCreator";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import MatrxTable from '@/components/matrx/EntityTable/MatrxServerTable';
import {EntityKeys, EntityData} from "@/types/entityTypes";
import {useToast} from '@/components/ui/use-toast';
import {useEntityTableActions} from "@/components/matrx/EntityTable/EnhancedAction/useEntityTableActions";

interface EntityTableProps {
    entityKey: EntityKeys;
    customActions?: string[];
    onModalOpen?: (type: string, data: EntityData<EntityKeys>) => void;
    customModalContent?: (data: EntityData<EntityKeys>) => React.ReactNode;
}

const EntityTable: React.FC<EntityTableProps> = (
    {
        entityKey,
        customActions = [],
        onModalOpen,
        customModalContent
    }) => {
    const dispatch = useAppDispatch();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const {toast} = useToast();

    // Create selectors and actions based on the passed entityKey
    const entitySelectors = createEntitySelectors(entityKey);
    const entityActions = createEntityActions(entityKey);

    const data = useAppSelector(entitySelectors.selectData);
    const loading = useAppSelector(entitySelectors.selectLoading);
    const error = useAppSelector(entitySelectors.selectError);
    const totalCount = useAppSelector(entitySelectors.selectTotalCount);
    const initialized = useAppSelector(entitySelectors.selectInitialized);

    // Set up action handlers
    const {handleAction} = useEntityTableActions(entityKey, {
        onModalOpen,
        onSuccess: (action, result) => {
            toast({
                title: 'Success',
                description: `${action} completed successfully`,
                variant: 'default',
            });
        },
        onError: (action, error) => {
            toast({
                title: 'Error',
                description: `Failed to ${action}: ${error.message}`,
                variant: 'destructive',
            });
        }
    });

    // Default actions plus any custom ones
    const availableActions = ['view', 'edit', 'delete', ...customActions];

    useEffect(() => {
        if (!loading && (!initialized || page > 0)) {
            dispatch(entityActions.fetchPaginatedRequest({
                page,
                pageSize,
                options: {},
                maxCount: 10000
            }));
        }
    }, [page, pageSize, loading, initialized, dispatch, entityActions]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const memoizedData = data;
    const memoizedTotalCount = totalCount;

    return (
        <div className="p-4 space-y-4">
            <h1 className="text-xl font-bold">
                {entityKey.charAt(0).toUpperCase() + entityKey.slice(1)} Table
            </h1>

            {loading && (
                <div className="flex justify-center p-4">
                    <div
                        className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
            )}

            {error?.message && (
                <div className="text-destructive p-4 rounded bg-destructive/10">
                    Error: {error.message}
                </div>
            )}

            {!loading && memoizedData && (
                <div className="space-y-4">
                    <MatrxTable
                        data={memoizedData}
                        actions={availableActions}
                        onAction={handleAction}
                        truncateAt={50}
                        onPageChange={handlePageChange}
                        isServerSide={true}
                        loading={loading}
                        totalCount={memoizedTotalCount}
                        serverPage={page}
                        serverPageSize={pageSize}
                        customModalContent={customModalContent}
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

export default EntityTable;
