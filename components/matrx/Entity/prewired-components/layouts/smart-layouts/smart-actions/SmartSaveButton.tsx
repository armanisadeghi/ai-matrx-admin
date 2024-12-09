import {EntityKeys} from "@/types/entityTypes";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {useCallback, useState} from "react";
import SmartButtonBase from "./SmartButtonBase";
import {Save} from "lucide-react";
import SmartChangeConfirmation from "./SmartChangeConfirmation";

interface SmartSaveButtonProps {
    entityKey: EntityKeys;
    size?: 'default' | 'sm' | 'lg' | 'icon';
    showConfirmation?: boolean;
}

export const SmartSaveButton = (
    {
        entityKey,
        size = 'default',
        showConfirmation = true
    }: SmartSaveButtonProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const {
        operationMode,
        hasUnsavedChanges,
        isOperationPending,
        selection
    } = entityCrud;

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const isDisabled = !hasUnsavedChanges ||
        (operationMode !== 'create' && operationMode !== 'update') ||
        selection.selectedRecordIds.some(id => isOperationPending(id));

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (showConfirmation) {
            setIsConfirmOpen(true);
        }
    }, [showConfirmation]);

    const handleComplete = useCallback((success: boolean) => {
        setIsConfirmOpen(false);
    }, []);

    return (
        <>
            <SmartButtonBase
                onClick={handleClick}
                disabled={isDisabled}
                size={size}
                variant="default"
            >
                <Save className="h-4 w-4"/>
                Save
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

SmartSaveButton.displayName = 'SmartSaveButton';

export default SmartSaveButton;
