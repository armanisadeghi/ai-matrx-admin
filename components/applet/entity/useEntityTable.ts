// useEntityTable.ts

import {useCallback, useEffect, useMemo, useState} from 'react';
// import {createEntitySelectors} from '@/lib/redux/entity/entitySelectors';
// import {createEntityActions} from '@/lib/redux/entity/entityActionCreator';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {useToast} from '@/components/ui/use-toast';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityCommandContext, EntityCommandName} from '@/components/matrx/MatrxCommands/EntityCommand';
import {
    selectEntityPrimaryKeyField,
    selectEntityDisplayField,
    selectEntityPrettyName,
    selectAllFieldPrettyNames
} from '@/lib/redux/schema/globalCacheSelectors';

interface UseEntityTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    customCommands?: any;
    onModalOpen?: (actionName: EntityCommandName, data: EntityData<TEntity>) => void;
    onModalClose?: () => void;
    parentCommandExecute?: (actionName: EntityCommandName, context: EntityCommandContext<TEntity>) => Promise<void>;
    useParentModal?: boolean;
}

export const useEntityTable = <TEntity extends EntityKeys>(
    {
        entityKey,
        customCommands = {},
        onModalOpen,
        onModalClose,
        parentCommandExecute,
        useParentModal = false
    }: UseEntityTableProps<TEntity>) => {
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

    const fieldPrettyNames = useAppSelector((state) =>
        selectAllFieldPrettyNames(state, {entityName: entityKey})
    );

    const defaultVisibleColumns = useMemo(() => {
        if (!data?.[0]) return [];
        const important = [primaryKeyField, displayField].filter(Boolean) as string[];
        const otherFields = Object.keys(data[0])
            .filter(field => !important.includes(field))
            .slice(0, 5);

        return [...important, ...otherFields];
    }, [data, primaryKeyField, displayField]);

    const commands = {
        expand: true,
        view: {setActiveOnClick: true},
        edit: {useCallback: true, setActiveOnClick: true},
        delete: {
            useCallback: true,
            requireConfirmation: true,
            confirmationMessage: 'Are you sure you want to delete this item?'
        },
        create: true,
        ...customCommands
    };

    const handleCommandExecute = useCallback(async (
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
                case 'edit':
                    dispatch(entityActions.setSelectedItem({index: context.index}));
                    if (!useParentModal && onModalOpen) onModalOpen(actionName, context.data);
                    break;
                case 'delete':
                    await dispatch(entityActions.deleteRequest(context.index));
                    toast({title: 'Success', description: 'Item deleted successfully', variant: 'default'});
                    break;
                case 'create':
                    dispatch(entityActions.createRequest(context.data));
                    if (!useParentModal && onModalOpen) onModalOpen(actionName, context.data);
                    break;
                case 'expand':
                    // TODO: Handle expand logic
                    break;
                default:
                    console.log(`Executing custom command: ${actionName}`);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: `Failed to execute ${actionName}: ${(error as Error).message}`,
                variant: 'destructive'
            });
        }
    }, [parentCommandExecute, entityActions, dispatch, useParentModal, onModalOpen, toast]);

    useEffect(() => {
        if (!loading && (!initialized || page > 0)) {
            dispatch(entityActions.fetchPaginatedRequest({
                page,
                pageSize,
                options: {},
                maxCount: 10000
            }));
        }
    }, [loading, initialized, page, pageSize, dispatch, entityActions]);

    return {
        data,
        loading,
        error,
        page,
        pageSize,
        totalCount,
        primaryKeyField,
        entityPrettyName,
        fieldPrettyNames,
        defaultVisibleColumns,
        commands,
        handleCommandExecute,
        handlePageChange: setPage,
        handlePageSizeChange: setPageSize
    };
};
