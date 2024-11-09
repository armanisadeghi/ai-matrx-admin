// useEntityTable.ts

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useAppDispatch, useAppSelector} from '@/lib/redux/hooks';
import {useToast} from '@/components/ui/use-toast';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {EntityCommandContext, EntityCommandName} from '@/components/matrx/MatrxCommands/EntityCommand';
import {createEntitySlice} from '@/lib/redux/entity/slice';
import {createEntitySelectors} from '@/lib/redux/entity/selectors';
import {Draft} from '@reduxjs/toolkit';

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
    const {toast} = useToast();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Generate slice and selectors based on entity key
    const {actions} = useMemo(() => createEntitySlice(entityKey, {} as any), [entityKey]);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    // Selectors
    const data = useAppSelector(selectors.selectAllRecords);
    const loading = useAppSelector(selectors.selectLoadingState).loading;
    const error = useAppSelector(selectors.selectError);
    const totalCount = useAppSelector(selectors.selectPaginationInfo).totalCount;

    // Access the primary key fields instead of a single field
    const primaryKeyFields = useAppSelector(selectors.selectPrimaryKeyMetadata)?.fields;
    const displayField = useAppSelector(selectors.selectDisplayField);
    const entityPrettyName = useAppSelector(selectors.selectEntityDisplayName);
    const fieldPrettyNamesArray = useAppSelector(selectors.selectFieldInfo);

    // Convert fieldPrettyNames to a Record<string, string>
    const fieldPrettyNames = useMemo(() => {
        return fieldPrettyNamesArray.reduce((acc, field) => {
            acc[field.name] = field.displayName;
            return acc;
        }, {} as Record<string, string>);
    }, [fieldPrettyNamesArray]);

    // Define default columns to display
    const defaultVisibleColumns = useMemo(() => {
        if (!data?.[0]) return [];
        const important = [...(primaryKeyFields || []), displayField].filter(Boolean) as string[];
        const otherFields = Object.keys(data[0])
            .filter(field => !important.includes(field))
            .slice(0, 5);

        return [...important, ...otherFields];
    }, [data, primaryKeyFields, displayField]);

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
                    dispatch(actions.setSelection({records: [context.data as Draft<EntityData<TEntity>>], mode: 'single'}));
                    if (!useParentModal && onModalOpen) onModalOpen(actionName, context.data);
                    break;
                case 'delete':
                    await dispatch(actions.deleteRecord({primaryKeyValues: context.data}));
                    toast({title: 'Success', description: 'Item deleted successfully', variant: 'default'});
                    break;
                case 'create':
                    dispatch(actions.createRecord(context.data as Draft<EntityData<TEntity>>));
                    if (!useParentModal && onModalOpen) onModalOpen(actionName, context.data);
                    break;
                case 'expand':
                    // Implement expand logic if needed
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
    }, [parentCommandExecute, actions, dispatch, useParentModal, onModalOpen, toast]);


    return {
        data: Object.values(data),
        loading,
        error,
        page,
        pageSize,
        totalCount,
        primaryKeyFields,
        entityPrettyName,
        fieldPrettyNames,
        defaultVisibleColumns,
        commands,
        handleCommandExecute,
        handlePageChange: setPage,
        handlePageSizeChange: setPageSize
    };
};
