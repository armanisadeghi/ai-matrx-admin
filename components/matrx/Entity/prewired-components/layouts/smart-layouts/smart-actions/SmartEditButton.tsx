import { EntityKeys } from "@/types/entityTypes";
import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import { useCallback } from "react";
import SmartButtonBase from "./SmartButtonBase";
import { Edit2 } from "lucide-react";

interface SmartEditButtonProps {
    entityKey: EntityKeys;
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const SmartEditButton = ({ entityKey, size = 'default' }: SmartEditButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const { operationMode, startUpdateMode, selection } = entityCrud;

    const isDisabled = operationMode !== 'view' ||
        (!selection.activeRecordId && selection.selectedRecordIds.length === 0);

    const handleEdit = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        startUpdateMode();
    }, [startUpdateMode]);

    return (
        <SmartButtonBase
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