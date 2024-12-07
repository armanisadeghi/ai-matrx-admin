import { EntityKeys } from "@/types/entityTypes";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {useCallback} from "react";
import SmartButtonBase
    from "./SmartButtonBase";
import {Plus} from "lucide-react";

interface SmartNewButtonProps {
    entityKey: EntityKeys;
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const SmartNewButton = ({ entityKey, size = 'default' }: SmartNewButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const {operationMode, startCreateMode} = entityCrud;

    const isDisabled = operationMode === 'create' || operationMode === 'update';

    const handleNew = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        startCreateMode(1);
    }, [startCreateMode]);

    return (
        <SmartButtonBase
            onClick={handleNew}
            disabled={isDisabled}
            size={size}
            variant="default"
        >
            <Plus className="h-4 w-4" />
            New
        </SmartButtonBase>
    );
};

SmartNewButton.displayName = 'SmartNewButton';

export default SmartNewButton;
