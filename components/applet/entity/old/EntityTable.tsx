'use client';

import React, {useCallback, useEffect, useState, useMemo} from 'react';
// import {createEntitySelectors} from "@/lib/redux/entity/entitySelectors";
// import {createEntityActions} from "@/lib/redux/entity/entityActionCreator";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import MatrxTable from '@/components/matrx/EntityTable/MatrxServerTable';
import {EntityKeys, EntityData} from "@/types/entityTypes";
import {useToast} from '@/components/ui/use-toast';
import {
    selectEntityPrimaryKeyField,
    selectEntityDisplayField,
    selectEntityPrettyName,
    selectFieldPrettyName,
    selectAllFieldPrettyNames
} from '@/lib/redux/schema/globalCacheSelectors';
import {EntityCommandContext, EntityCommandName} from "@/components/matrx/MatrxCommands/EntityCommand";



interface EntityTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    customCommands?: {
        [key in EntityCommandName]?: boolean | {
        useCallback?: boolean;
        setActiveOnClick?: boolean;
        hidden?: boolean;
    };
    };
    onModalOpen?: (actionName: EntityCommandName, data: EntityData<TEntity>) => void;
    onModalClose?: () => void;
    customModalContent?: (data: EntityData<TEntity>) => React.ReactNode;
    useParentModal?: boolean;
    useParentRowHandling?: boolean;
    onCommandExecute?: (
        actionName: EntityCommandName,
        context: EntityCommandContext<TEntity>
    ) => Promise<void>;
}

const EntityTable = <TEntity extends EntityKeys>({
        entityKey,
    customCommands = {},
        onModalOpen,
    onModalClose,
    customModalContent,
    useParentModal = false,
    useParentRowHandling = false,
    onCommandExecute: parentCommandExecute,
}: EntityTableProps<TEntity>) => {
    const dispatch = useAppDispatch();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const {toast} = useToast();

    const entitySelectors = createEntitySelectors(entityKey);
    const entityActions = createEntityActions(entityKey);

    const data = useAppSelector(entitySelectors.selectData);
    const loading = useAppSelector(entitySelectors.selectLoading);
    const error = useAppSelector(entitySelectors.selectError);
    const totalCount = useAppSelector(entitySelectors.selectTotalCount);
    const initialized = useAppSelector(entitySelectors.selectInitialized);

    const primaryKeyField = useAppSelector((state) =>
        selectEntityPrimaryKeyField(state, entityKey)
    );
    const displayField = useAppSelector((state) =>
        selectEntityDisplayField(state, entityKey)
    );

    const entityPrettyName = useAppSelector((state) =>
        selectEntityPrettyName(state, entityKey)
    );

    console.log(`Entity Pretty Name for ${entityKey}:`, entityPrettyName);

    const fieldPrettyNames = useAppSelector((state) =>
        selectAllFieldPrettyNames(state, { entityName: entityKey })
    );
    console.log(`All Field Pretty Names for ${entityKey}:`, fieldPrettyNames);

    // Default visible columns
    const defaultVisibleColumns = useMemo(() => {
        if (!data?.[0]) return [];
        const important = [primaryKeyField, displayField].filter(Boolean) as string[];
        const otherFields = Object.keys(data[0])
            .filter(field => !important.includes(field))
            .slice(0, 5);

        return [...important, ...otherFields];
    }, [data, primaryKeyField, displayField]);

    // Command configuration
    const defaultCommands = {
        expand: true,
        view: { setActiveOnClick: true },
        edit: {
            useCallback: true,
            setActiveOnClick: true
        },
        delete: {
            useCallback: true,
            requireConfirmation: true,
            confirmationMessage: 'Are you sure you want to delete this item?'
        },
        create: true
    };

    const commands = {
        ...defaultCommands,
        ...customCommands
    };

    // Command execution handler
    const handleCommandExecute = async (
        actionName: EntityCommandName,
        context: EntityCommandContext<TEntity>
    ) => {
        try {
            if (parentCommandExecute) {
                await parentCommandExecute(actionName, context);
                return;
            }

            switch (actionName) {
                case 'view':
                    dispatch(entityActions.setSelectedItem({ index: context.index }));
                    if (!useParentModal && onModalOpen) {
                        onModalOpen(actionName, context.data);
                    }
                    break;

                case 'edit':
                    dispatch(entityActions.setSelectedItem({ index: context.index }));
                    if (!useParentModal && onModalOpen) {
                        onModalOpen(actionName, context.data);
                    }
                    break;

                case 'delete':
                await dispatch(entityActions.deleteRequest(context.index));

            toast({
                title: 'Success',
                        description: 'Item deleted successfully',
                variant: 'default',
            });
                    break;

            case 'create':
                dispatch(entityActions.createRequest(context.data));
                if (!useParentModal && onModalOpen) {
                    onModalOpen(actionName, context.data);
                }
                break;

                case 'expand':
                    // TODO: Handle expand logic
                    break;

                default:
                    if (customCommands[actionName]) {
                        // Handle custom commands
                        console.log(`Executing custom command: ${actionName}`);
                    }
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to execute ${actionName}: ${(error as Error).message}`,
                variant: 'destructive',
            });
        }
    };

    // Fetch data
    useEffect(() => {
        if (!loading && (!initialized || page > 0)) {
            dispatch(entityActions.fetchPaginatedRequest({
                page,
                pageSize,
                options: {},
                maxCount: 10000
            }));
        }
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
    }, []);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPageSize(newPageSize);
    }, []);

    if (error?.message) {
        return (
            <div className="text-destructive p-4 rounded bg-destructive/10">
                Error: {error.message}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">

            <h1 className="text-xl font-bold">
            {entityPrettyName}
            </h1>

            {loading && (
                <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"/>
                </div>
            )}

            {!loading && data && primaryKeyField && (
                <div className="flex-1 min-h-0">
                    <MatrxTable
                        entityKey={entityKey}
                        data={data}
                        primaryKey={primaryKeyField as keyof EntityData<TEntity>}
                        commands={commands}
                        onCommandExecute={handleCommandExecute}
                        onModalOpen={onModalOpen}
                        onModalClose={onModalClose}
                        defaultVisibleColumns={defaultVisibleColumns}
                        columnHeaders={fieldPrettyNames}
                        truncateAt={50}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        isServerSide={true}
                        loading={loading}
                        totalCount={totalCount}
                        serverPage={page}
                        serverPageSize={pageSize}
                        customModalContent={customModalContent}
                        useParentModal={useParentModal}
                        useParentRowHandling={useParentRowHandling}
                    />

                    {totalCount !== undefined && (
                        <div className="text-muted-foreground text-sm">
                            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} entries
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EntityTable;
