import React from "react";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {useCallback} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {Plus} from "lucide-react";
import {SmartButtonProps} from "./types";

export const SmartNewButton = (
    {
        entityKey,
        size = 'default'
    }: SmartButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const {
        flags,
        dataState,
        startCreateMode
    } = entityCrud;

    // According to our state matrix, New button should be disabled when:
    // 1. Currently in create or update mode
    // 2. During any loading operation
    // 3. During delete confirmation
    const isDisabled =
        ['create', 'update'].includes(flags.operationMode || '') ||
        dataState.isLoading ||
        flags.operationMode === 'delete';

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
            loading={dataState.isLoading}
        >
            <Plus className="h-4 w-4"/>
            New
        </SmartButtonBase>
    );
};

SmartNewButton.displayName = 'SmartNewButton';

export default SmartNewButton;
