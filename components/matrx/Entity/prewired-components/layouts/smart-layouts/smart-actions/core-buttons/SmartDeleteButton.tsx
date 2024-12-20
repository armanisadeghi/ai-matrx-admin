import React, {memo, useCallback, useState} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {Trash2} from "lucide-react";
import {SmartButtonProps} from "../types";
import SmartDeleteConfirmation from "../confirmation/SmartDeleteConfirmation";
import {createEntitySelectors, useAppSelector} from "@/lib/redux";
import {MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";

export const SmartDeleteButton = memo((
    {
        entityKey,
        size = 'default'
    }: SmartButtonProps) => {

    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const pendingOperations = useAppSelector(selectors.selectPendingOperations);
    const isOperationPending = useCallback((matrxRecordId: MatrxRecordId) =>
            pendingOperations.includes(matrxRecordId)
        , [pendingOperations]);



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
