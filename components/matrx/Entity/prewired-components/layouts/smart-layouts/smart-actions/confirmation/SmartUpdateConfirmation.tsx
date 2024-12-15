import {EntityKeys} from "@/types/entityTypes";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {useMemo, useCallback} from "react";
import ConfirmationDialog from "./ConfirmationDialog";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppSelector} from "@/lib/redux/hooks";
import {cn} from "@/lib/utils";
import {useEntityToasts} from "@/lib/redux/entity/hooks/useEntityToasts";

interface SmartUpdateConfirmationProps {
    entityKey: EntityKeys;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SmartUpdateConfirmation = (
    {
        entityKey,
        open,
        onOpenChange,
    }: SmartUpdateConfirmationProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const entityToasts = useEntityToasts(entityKey);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const comparison = useAppSelector(selectors.selectChangeComparison);
    const {handleUpdate} = entityCrud;

    const handleConfirm = useCallback(() => {
        console.log('Update confirmation - handleConfirm', {
            recordId: comparison.matrxRecordId
        });

        const callback = (result: { success: boolean; error?: any }) => {
            if (result.success) {
                entityToasts.handleUpdateSuccess();
                onOpenChange(false);
            } else {
                entityToasts.handleError(result.error, 'update');
            }
        };

        if (comparison.matrxRecordId) {
            handleUpdate(comparison.matrxRecordId, callback);
        }
    }, [handleUpdate, comparison.matrxRecordId, entityToasts, onOpenChange]);

    const handleCancel = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    if (!comparison.hasChanges) {
        return null;
    }

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={`Save Changes${comparison.displayName ? ` - ${comparison.displayName}` : ''} [UPDATE DIALOG]`}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            confirmText="Save"
            intent="default"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    {comparison.fieldInfo.map(field => {
                        if (!field.hasChanged) return null;

                        return (
                            <div
                                key={field.name}
                                className={cn(
                                    "rounded-md p-3",
                                    "border border-border/50",
                                    "bg-muted"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <label className="text-sm font-medium">
                                        {field.displayName}
                                    </label>
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        Modified
                                    </span>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div className="text-sm space-y-1">
                                        <span className="text-xs text-muted-foreground">Original</span>
                                        <div className="font-medium">{field.originalValue || 'BLANK'}</div>
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <span className="text-xs text-muted-foreground">New</span>
                                        <div className="font-medium text-primary">{field.newValue || 'BLANK'}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </ConfirmationDialog>
    );
};

export default SmartUpdateConfirmation;
