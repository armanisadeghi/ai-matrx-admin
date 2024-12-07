// components/common/crud/SmartDeleteButton.tsx
import {EntityKeys} from "@/types/entityTypes";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {memo, useCallback, useState} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {Trash2} from "lucide-react";
import SmartDeleteConfirmation from "./SmartDeleteConfirmation";

interface SmartDeleteButtonProps {
    entityKey: EntityKeys;
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const SmartDeleteButton = memo(({
                                           entityKey,
                                           size = 'default'
                                       }: SmartDeleteButtonProps) => {
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
