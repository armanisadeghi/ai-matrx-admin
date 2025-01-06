import React from "react";
import {useCallback} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {SmartButtonProps} from "../types";
import {Plus} from "lucide-react";
import {useAppSelector, useEntityTools} from "@/lib/redux";

export const SmartNewButton = (
    {
        entityKey,
        size = 'default'
    }: SmartButtonProps) => {

    const { actions, selectors, dispatch, store } = useEntityTools(entityKey);
    const operationMode = useAppSelector(selectors.selectOperationMode);
    const hasUnsavedChanges = useAppSelector(selectors.selectHasUnsavedChanges);
    const isLoading = useAppSelector(selectors.selectIsLoading);

    
    const startCreateMode = useCallback((count: number = 1) => {
        dispatch(actions.startRecordCreation({count}));
    }, [dispatch, actions]);

    const isDisabled =
        ['create', 'update'].includes(operationMode || '') ||
        isLoading ||
        operationMode === 'delete';

    const handleNew = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (hasUnsavedChanges) {
            return;
        }

        startCreateMode(1);
    }, [hasUnsavedChanges, startCreateMode]);

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
