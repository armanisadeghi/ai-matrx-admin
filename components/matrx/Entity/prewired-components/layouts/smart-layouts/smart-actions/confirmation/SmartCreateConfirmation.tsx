import {EntityKeys} from "@/types/entityTypes";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {useMemo, useCallback} from "react";
import ConfirmationDialog from "./ConfirmationDialog";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppSelector} from "@/lib/redux/hooks";
import {cn} from "@/lib/utils";
import {useEntityToasts} from "@/lib/redux/entity/hooks/useEntityToasts";
import {FlexibleQueryOptions} from "@/lib/redux/entity/types/stateTypes";

interface SmartCreateConfirmationProps {
    entityKey: EntityKeys;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SmartCreateConfirmation = (
    {
        entityKey,
        open,
        onOpenChange,
    }: SmartCreateConfirmationProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const entityToasts = useEntityToasts(entityKey);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const comparison = useAppSelector(selectors.selectChangeComparison);

    console.log('SmartCreateConfirmation - comparison:', comparison);

    const {handleCreate} = entityCrud;

    const handleConfirm = useCallback(() => {
        console.log('Create confirmation - handleConfirm', {
            recordId: comparison.matrxRecordId
        });

        const callback = (result: { success: boolean; error?: any }) => {
            if (result.success) {
                entityToasts.handleCreateSuccess();
                onOpenChange(false);
            } else {
                entityToasts.handleError(result.error, 'create');
            }
        };

        if (comparison.matrxRecordId) {
            const createPayload: FlexibleQueryOptions = {
                entityNameAnyFormat: entityKey,
                tempRecordId: comparison.matrxRecordId,
                data: comparison.changedFieldData
            }
            handleCreate([createPayload], callback);
        }
    }, [handleCreate, comparison.matrxRecordId, entityToasts, onOpenChange]);

    const handleCancel = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Create New Record"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            confirmText="Create"
            intent="default"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    {comparison.fieldInfo.map(field => (
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
                                    New
                                </span>
                            </div>
                            <div className="mt-1">
                                <div className="text-sm font-medium">
                                    {field.newValue ?? 'BLANK'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ConfirmationDialog>
    );
};

export default SmartCreateConfirmation;
