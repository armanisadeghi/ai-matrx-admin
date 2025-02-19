// useEntityTable.ts

import React, { useCallback, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useToast } from "@/components/ui/use-toast";
import { EntityKeys, EntityData } from "@/types/entityTypes";
import { EntityCommandContext, EntityCommandName } from "@/components/matrx/MatrxCommands/EntityCommand";
import { useEntityAllData } from "@/lib/redux/entity/hooks/coreHooks";
import { FlexibleQueryOptions } from "@/lib/redux/entity/types/stateTypes";

interface UseEntityTableProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    customCommands?: any;
    onModalOpen?: (actionName: EntityCommandName, data: EntityData<TEntity>) => void;
    onModalClose?: () => void;
    parentCommandExecute?: (actionName: EntityCommandName, context: EntityCommandContext<TEntity>) => Promise<void>;
    useParentModal?: boolean;
}

export const useEntityTable = <TEntity extends EntityKeys>({
    entityKey,
    customCommands = {},
    onModalOpen,
    onModalClose,
    parentCommandExecute,
    useParentModal = false,
}: UseEntityTableProps<TEntity>) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const {
        selectors,
        actions,
        store,
        pkType,
        pkFields,
        fields,
        firstPkField,
        pkValueToMatrxId,
        matrxIdToPks,
        pkValuesToMatrxId,
        FetchStrategy,
        activeRecordId,
        activeRecord,
        allRecordsWithKeys,
        selectedRecords,
        selectedRecordIds,
        effectiveRecords,
        isLoading: loading,
        error,
    } = useEntityAllData(entityKey);

    // Selectors
    const totalCount = useAppSelector(selectors.selectPaginationInfo).totalCount;

    // Access the primary key fields instead of a single field
    const displayField = useAppSelector(selectors.selectDisplayField);
    const entityPrettyName = useAppSelector(selectors.selectEntityDisplayName);

    // Define default columns to display
    const defaultVisibleColumns = useMemo(() => {
        if (!allRecordsWithKeys?.[0]) return [];

        const important = [...(pkFields || []), displayField].filter(Boolean) as string[];

        const otherFields = Object.keys(allRecordsWithKeys[0])
            .filter((field) => field !== "matrxRecordId" && !important.includes(field))
            .slice(0, 5);

        return [...important, ...otherFields];
    }, [allRecordsWithKeys, pkFields, displayField]);

    const commands = {
        expand: true,
        view: { setActiveOnClick: true },
        edit: { useCallback: true, setActiveOnClick: true },
        delete: {
            useCallback: true,
            requireConfirmation: true,
            confirmationMessage: "Are you sure you want to delete this item?",
        },
        create: true,
        ...customCommands,
    };

    const handleCommandExecute = useCallback(
        async (actionName: EntityCommandName, context: EntityCommandContext<TEntity>) => {
            try {
                if (parentCommandExecute) {
                    await parentCommandExecute(actionName, context);
                    return;
                }

                switch (actionName) {
                    case "view":
                    case "edit":
                        dispatch(actions.addToSelection(context.matrxRecordId));
                        if (!useParentModal && onModalOpen) onModalOpen(actionName, context.data);
                        break;
                    case "delete":
                        dispatch(actions.deleteRecord(context.matrxRecordId));
                        toast({ title: "Success", description: "Item deleted successfully", variant: "default" });
                        break;
                    case "create":
                        dispatch(actions.createRecord(context.data as FlexibleQueryOptions));
                        if (!useParentModal && onModalOpen) onModalOpen(actionName, context.data);
                        break;
                    case "expand":
                        break;
                    default:
                        console.log(`Executing custom command: ${actionName}`);
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: `Failed to execute ${actionName}: ${(error as Error).message}`,
                    variant: "destructive",
                });
            }
        },
        [parentCommandExecute, actions, dispatch, useParentModal, onModalOpen, toast]
    );

    return {
        data: allRecordsWithKeys,
        loading,
        error,
        page,
        pageSize,
        totalCount,
        pkFields,
        entityPrettyName,
        defaultVisibleColumns,
        commands,
        handleCommandExecute,
        handlePageChange: setPage,
        handlePageSizeChange: setPageSize,
    };
};
