import React, {memo, useCallback, useState} from "react";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import SmartButtonBase from "./SmartButtonBase";
import {Trash2} from "lucide-react";
import {SmartButtonProps} from "../types";
import SmartDeleteConfirmation from "../confirmation/SmartDeleteConfirmation";

export const SmartDeleteButton = memo((
    {
        entityKey,
        size = 'default'
    }: SmartButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const {isOperationPending, activeRecordId} = entityCrud;
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const isDisabled = !activeRecordId ||
        isOperationPending(activeRecordId);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsConfirmOpen(true);
    }, []);

    const handleComplete = useCallback((success: boolean) => {
        setIsConfirmOpen(false);
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
                variant="destructive"
            >
                <Trash2 className="h-4 w-4"/>
                Delete
            </SmartButtonBase>

            {isConfirmOpen && (
                <SmartDeleteConfirmation
                    entityKey={entityKey}
                    open={isConfirmOpen}
                    onOpenChange={handleOpenChange}
                    onComplete={handleComplete}
                />
            )}
        </>
    );
});

SmartDeleteButton.displayName = 'SmartDeleteButton';

export default SmartDeleteButton;
