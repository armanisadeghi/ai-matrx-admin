import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import React, { useCallback } from "react";
import { X } from "lucide-react";
import SmartButtonBase from "./SmartButtonBase";
import { SmartButtonProps } from "../types";

export const SmartCancelButton = ({ entityKey, size = 'default' }: SmartButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const { operationMode, cancelOperation, hasUnsavedChanges } = entityCrud;
    const isDisabled = operationMode === 'view';

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        cancelOperation();
    }, [hasUnsavedChanges, cancelOperation]);

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

        </>
    );
};

SmartCancelButton.displayName = 'SmartCancelButton';

export default SmartCancelButton;
