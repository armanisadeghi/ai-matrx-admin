import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import { useCallback } from "react";
import { Edit2 } from "lucide-react";
import SmartButtonBase from "./SmartButtonBase";
import {SmartButtonProps} from "../types";


export const SmartEditButton = ({ entityKey, size = 'default' }: SmartButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const { operationMode, startUpdateMode, activeRecordId, selectedRecordIds } = entityCrud;

    const isDisabled = operationMode !== 'view' ||
        (!activeRecordId && selectedRecordIds.length === 0);

    const handleEdit = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        startUpdateMode();
    }, [startUpdateMode]);

    return (
        <SmartButtonBase
            entityKey={entityKey}
            onClick={handleEdit}
            disabled={isDisabled}
            size={size}
            variant="secondary"
        >
            <Edit2 className="h-4 w-4" />
            Edit
        </SmartButtonBase>
    );
};

SmartEditButton.displayName = 'SmartEditButton';

export default SmartEditButton;
