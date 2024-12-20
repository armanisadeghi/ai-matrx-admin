import React, {memo, useCallback, useState} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {SmartButtonProps} from "../types";
import {Save} from "lucide-react";
import SmartUpdateConfirmation from "../confirmation/SmartUpdateConfirmation";
import SmartCreateConfirmation from "../confirmation/SmartCreateConfirmation";
import {createEntitySelectors, useAppSelector} from "@/lib/redux";

export const SmartSaveButton = memo((
    {
        entityKey,
        size = 'default',
        hideText = false
    }: SmartButtonProps) => {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const operationMode = useAppSelector(selectors.selectOperationMode);
    const hasUnsavedChanges = useAppSelector(selectors.selectHasUnsavedChanges);

    const entityStatus = useAppSelector(selectors.selectEntityStatus);
    const isLoading = entityStatus === 'loading';

    const isValidMode = operationMode === 'create' || operationMode === 'update';

    const isDisabled = (
        isLoading ||        // Don't allow saves while loading
        !hasUnsavedChanges || // Must have changes to save
        !isValidMode         // Must be in create or update mode
    );

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsConfirmOpen(true);
    }, []);

    const handleOpenChange = useCallback((open: boolean) => {
        setIsConfirmOpen(open);
    }, []);

    return (
        <>
            <SmartButtonBase
                entityKey={entityKey}
                onClick={handleClick}
                disabled={isDisabled}
                size={size}
                variant="default"
                loading={isLoading}
            >
                <Save className="h-4 w-4"/>
                {!hideText && "Save"}
            </SmartButtonBase>

            {isConfirmOpen && (
                operationMode === 'create' ? (
                    <SmartCreateConfirmation
                        entityKey={entityKey}
                        open={isConfirmOpen}
                        onOpenChange={handleOpenChange}
                    />
                ) : (
                    <SmartUpdateConfirmation
                        entityKey={entityKey}
                        open={isConfirmOpen}
                        onOpenChange={handleOpenChange}
                    />
                )
            )}
        </>
    );
});

SmartSaveButton.displayName = 'SmartSaveButton';

export default SmartSaveButton;
