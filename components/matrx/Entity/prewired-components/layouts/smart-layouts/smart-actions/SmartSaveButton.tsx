import React from 'react';
import {EntityKeys} from "@/types/entityTypes";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {useCallback, useState} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {Save} from "lucide-react";
import SmartChangeConfirmation from "./SmartChangeConfirmation";

interface SmartSaveButtonProps {
    entityKey: EntityKeys;
    size?: 'default' | 'sm' | 'lg' | 'icon';
    showConfirmation?: boolean;
}

export const SmartSaveButton = (
    {
        entityKey,
        size = 'default',
        showConfirmation = true
    }: SmartSaveButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const {
        flags,
        dataState,
        selection,
        handleCreate,
        updateSelectedRecords,
    } = entityCrud;

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    // Determine if the button should be disabled based on our state matrix
    const isDisabled = (
        !flags.hasUnsavedChanges || // No changes to save
        dataState.isLoading || // Operation in progress
        !['create', 'update'].includes(flags.operationMode || '') || // Not in a valid mode for saving
        selection.selectedRecordIds.length === 0 // No record selected
    );

    const handleSave = useCallback(() => {
        if (flags.operationMode === 'create') {
            return handleCreate((result) => {
                if (result.success) {
                    // Handle successful creation
                }
            });
        } else if (flags.operationMode === 'update') {
            return updateSelectedRecords();
        }
        return false;
    }, [flags.operationMode, handleCreate, updateSelectedRecords]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (showConfirmation) {
            setIsConfirmOpen(true);
        } else {
            handleSave();
        }
    }, [showConfirmation, handleSave]);

    const handleComplete = useCallback((success: boolean) => {
        setIsConfirmOpen(false);
        if (success) {
            handleSave();
        }
    }, [handleSave]);

    return (
        <>
            <SmartButtonBase
                onClick={handleClick}
                disabled={isDisabled}
                size={size}
                variant="default"
                loading={dataState.isLoading}
            >
                <Save className="h-4 w-4"/>
                Save
            </SmartButtonBase>

            <SmartChangeConfirmation
                entityKey={entityKey}
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onComplete={handleComplete}
            />
        </>
    );
};

SmartSaveButton.displayName = 'SmartSaveButton';

export default SmartSaveButton;
