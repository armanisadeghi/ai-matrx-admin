// components/common/crud/SmartDeleteButton.tsx

import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {memo, useCallback, useState} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {Trash2} from "lucide-react";
import SmartDeleteConfirmation from "./SmartDeleteConfirmation";
import {SmartButtonProps} from "./types";


export const SmartDeleteButton = memo(({
                                           entityKey,
                                           size = 'default'
                                       }: SmartButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const {selection, isOperationPending} = entityCrud;
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const isDisabled = !selection.activeRecordId ||
        isOperationPending(selection.activeRecordId);

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

            <SmartDeleteConfirmation
                entityKey={entityKey}
                open={isConfirmOpen}
                onOpenChange={handleOpenChange}
                onComplete={handleComplete}
            />
        </>
    );
});


SmartDeleteButton.displayName = 'SmartDeleteButton';

export default SmartDeleteButton;
