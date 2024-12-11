// SmartCancelButton.tsx
import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import { useCallback, useState } from "react";
import SmartButtonBase from "./SmartButtonBase";
import { X } from "lucide-react";
import SmartChangeConfirmation from "./SmartChangeConfirmation";
import {SmartButtonProps} from "./types";


export const SmartCancelButton = ({ entityKey, size = 'default' }: SmartButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const { operationMode, cancelOperation, hasUnsavedChanges } = entityCrud;
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const isDisabled = operationMode === 'view';

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasUnsavedChanges) {
            setIsConfirmOpen(true);
        } else {
            cancelOperation();
        }
    }, [hasUnsavedChanges, cancelOperation]);

    const handleComplete = useCallback((success: boolean) => {
        setIsConfirmOpen(false);
        if (!success) {
            cancelOperation();
        }
    }, [cancelOperation]);

    return (
        <>
            <SmartButtonBase
                entityKey={entityKey}
                onClick={handleClick}
                disabled={isDisabled}
                size={size}
                variant="outline"
            >
                <X className="h-4 w-4" />
                Cancel
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

SmartCancelButton.displayName = 'SmartCancelButton';

export default SmartCancelButton;
