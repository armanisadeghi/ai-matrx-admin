'use client';

import React, {useCallback, useMemo, useState} from 'react';
import {EntityKeys, EntityData} from "@/types/entityTypes";
import MatrxTable from '@/components/matrx/EntityTable/MatrxServerTable';
import {EntityCommandContext, EntityCommandName} from "@/components/matrx/MatrxCommands/EntityCommand";
import {useEntityTable} from './useEntityTable';
import {useAppDispatch} from "@/lib/redux/hooks";
import { getEntitySlice } from '@/lib/redux/entity/entitySlice';
import { getEntityMetadata, getEntityPrettyFields, getFieldSelectOptions } from '@/lib/redux/entity/utils/direct-schema';


interface EntityTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    customCommands?: any;
    onModalOpen?: (actionName: EntityCommandName, data: EntityData<TEntity>) => void;
    onModalClose?: () => void;
    customModalContent?: (data: EntityData<TEntity>) => React.ReactNode;
    useParentModal?: boolean;
    useParentRowHandling?: boolean;
    onCommandExecute?: (actionName: EntityCommandName, context: EntityCommandContext<TEntity>) => Promise<void>;
}

const EntityTable = <TEntity extends EntityKeys>(
    {
        entityKey,
        customCommands = {},
        onModalOpen,
        onModalClose,
        customModalContent,
        useParentModal = false,
        useParentRowHandling = false,
        onCommandExecute: parentCommandExecute,
    }: EntityTableProps<TEntity>) => {

        const metadata = getEntityMetadata(entityKey);
        const fields = metadata.entityFields;
        const pkMeta = metadata?.primaryKeyMetadata;
        const pkType = pkMeta?.type;
        const pkFields = pkMeta?.fields || [];
        const firstPkField = useMemo(() => pkFields[0], [pkFields]);
        const entityPrettyName = metadata.displayName;
        const fieldPrettyNames = getEntityPrettyFields(entityKey);
        const fieldSelectOptions = getFieldSelectOptions(entityKey);




    const {
        data,
        loading,
        error,
        page,
        pageSize,
        totalCount,
        defaultVisibleColumns,
        commands,
        handleCommandExecute,
        handlePageChange,
        handlePageSizeChange
    } = useEntityTable({
        entityKey,
        customCommands,
        onModalOpen,
        onModalClose,
        parentCommandExecute,
        useParentModal
    });




    const dispatch = useAppDispatch();

    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const [lastError, setLastError] = useState<any>(null);

    const safeDispatch = useCallback((action: any) => {
        try {
            dispatch(action);
        } catch (error) {
            console.error(`Error dispatching action for ${entityKey}:`, error);
            setLastError(error);
        }
    }, [dispatch, entityKey]);

    React.useEffect(() => {
        if (!loading) {
            safeDispatch(actions.fetchRecords({page, pageSize}));
        }
    }, [entityKey]);

    if (error?.message) {
        return (
            <div className="text-destructive p-4 rounded bg-destructive/10">
                Error: {error.message}
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <h1 className="text-xl font-bold">{entityPrettyName}</h1>
            {loading ? (
                <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"/>
                </div>
            ) : data && pkFields && pkFields.length > 0 ? (
                <div className="flex-1 min-h-0">
                    <MatrxTable
                        entityKey={entityKey}
                        data={data}
                        primaryKey={firstPkField}
                        commands={commands}
                        onCommandExecute={handleCommandExecute}
                        onModalOpen={onModalOpen}
                        onModalClose={onModalClose}
                        defaultVisibleColumns={defaultVisibleColumns}
                        fieldSelectOptions={fieldSelectOptions}
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
            ) : null}
        </div>
    );
};

export default EntityTable;
