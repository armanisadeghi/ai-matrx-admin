import React from "react";
import {useCallback} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {SmartButtonProps} from "../types";
import {Plus} from "lucide-react";
import {createEntitySelectors, getEntitySlice, useAppDispatch, useAppSelector} from "@/lib/redux";

export const SmartNewButton = (
    {
        entityKey,
        size = 'default'
    }: SmartButtonProps) => {

    const dispatch = useAppDispatch();
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const {actions} = React.useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const operationMode = useAppSelector(selectors.selectOperationMode);
    const flags = useAppSelector(selectors.selectEntityFlags);
    const dataState = useAppSelector(selectors.selectDataState);
    const isLoading = dataState.isLoading
    const startCreateMode = useCallback((count: number = 1) => {
        dispatch(actions.startRecordCreation({count}));
    }, [dispatch, actions]);



    // According to our state matrix, New button should be disabled when:
    // 1. Currently in create or update mode
    // 2. During any loading operation
    // 3. During delete confirmation
    const isDisabled =
        ['create', 'update'].includes(operationMode || '') ||
        isLoading ||
        operationMode === 'delete';

    const handleNew = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // If there are unsaved changes, we should handle that first
        if (flags.hasUnsavedChanges) {
            // Here we could either:
            // 1. Show a confirmation dialog
            // 2. Dispatch an action to clear unsaved changes
            // 3. Prevent the action entirely

            // For now, let's prevent the action as it's safer
            return;
        }

        startCreateMode(1);
    }, [flags.hasUnsavedChanges, startCreateMode]);

    return (
        <SmartButtonBase
            entityKey={entityKey}
            onClick={handleNew}
            disabled={isDisabled}
            size={size}
            variant="default"
            loading={isLoading}
        >
            <Plus className="h-4 w-4"/>
            New
        </SmartButtonBase>
    );
};

SmartNewButton.displayName = 'SmartNewButton';

export default SmartNewButton;
