import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {memo, useCallback, useState} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {SmartButtonProps} from "../types";
import {Save} from "lucide-react";
import SmartUpdateConfirmation from "../confirmation/SmartUpdateConfirmation";
import SmartCreateConfirmation from "../confirmation/SmartCreateConfirmation";

export const SmartSaveButton = memo((
    {
        entityKey,
        size = 'default',
        hideText = false
    }: SmartButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const {flags, isLoading, hasUnsavedChanges, operationMode} = entityCrud;
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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