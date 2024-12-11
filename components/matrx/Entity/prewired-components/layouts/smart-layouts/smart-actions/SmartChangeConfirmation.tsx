import {EntityKeys} from "@/types/entityTypes";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {useMemo, useCallback} from "react";
import ConfirmationDialog from "./ConfirmationDialog";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppSelector} from "@/lib/redux/hooks";
import {cn} from "@/lib/utils";
import {useEntityToasts} from "@/lib/redux/entity/hooks/useEntityToasts";


interface SmartChangeConfirmationProps {
    entityKey: EntityKeys;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete?: (success: boolean) => void;
}

export const SmartChangeConfirmation = (
    {
        entityKey,
        open,
        onOpenChange,
        onComplete
    }: SmartChangeConfirmationProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const entityToasts = useEntityToasts(entityKey);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const comparison = useAppSelector(selectors.selectChangeComparison);
    const {operationMode, handleCreate, handleUpdate, cancelOperation} = entityCrud;

    const dialogConfig = useMemo(() => {
        switch (operationMode) {
            case 'create':
                return {
                    title: 'Create New Record',
                    confirmText: 'Create',
                    intent: 'default' as const
                };
            case 'update':
                return {
                    title: `Save Changes${comparison.displayName ? ` - ${comparison.displayName}` : ''}`,
                    confirmText: 'Save',
                    intent: 'default' as const
                };
            default:
                return {
                    title: 'Confirm Changes',
                    confirmText: 'Continue',
                    intent: 'default' as const
                };
        }
    }, [operationMode, comparison.displayName]);

    const handleConfirm = useCallback(() => {
        console.log("SmartChangeConfirmation.tsx handleConfirm");
        const callback = (result: { success: boolean; error?: any }) => {
            if (result.success) {
                if (operationMode === 'create') {
                    entityToasts.handleCreateSuccess();
                } else if (operationMode === 'update') {
                    entityToasts.handleUpdateSuccess();
                }
                onOpenChange(false);
                onComplete?.(true);
            } else {
                const operation = operationMode === 'create' ? 'create' : 'update';
                entityToasts.handleError(result.error, operation);
                onComplete?.(false);
            }
        };

        if (operationMode === 'create') {
            console.log("SmartChangeConfirmation.tsx handleConfirm handleCreate");
            handleCreate(callback);
        } else if (operationMode === 'update' && comparison.matrxRecordId) {

            console.log("SmartChangeConfirmation.tsx handleConfirm handleUpdate with:", comparison.matrxRecordId);

            handleUpdate(comparison.matrxRecordId, callback);
        }
    }, [
        operationMode,
        handleCreate,
        handleUpdate,
        comparison.matrxRecordId,
        onOpenChange,
        onComplete,
        entityToasts
    ]);

    const handleCancel = useCallback(() => {
        onOpenChange(false);
        if (operationMode !== 'view') {
            cancelOperation();
        }
        onComplete?.(false);
    }, [onOpenChange, cancelOperation, operationMode, onComplete]);

    if (!comparison.hasChanges && !comparison.isNewRecord) {
        return null;
    }

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={dialogConfig.title}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            confirmText={dialogConfig.confirmText}
            intent={dialogConfig.intent}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    {comparison.fieldInfo.map(field => {
                        if (!field.hasChanged && !comparison.isNewRecord) return null;

                        return (
                            <div
                                key={field.name}
                                className={cn(
                                    "rounded-md p-3",
                                    "border border-border/50",
                                    field.hasChanged && "bg-muted"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <label className="text-sm font-medium">
                                        {field.displayName}
                                    </label>
                                    {field.hasChanged && (
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                            Modified
                                        </span>
                                    )}
                                </div>

                                {!comparison.isNewRecord && field.hasChanged ? (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <div className="text-sm space-y-1">
                                            <span className="text-xs text-muted-foreground">Original</span>
                                            <div className="font-medium">{field.originalValue || '-'}</div>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <span className="text-xs text-muted-foreground">New</span>
                                            <div className="font-medium text-primary">{field.newValue || '-'}</div>
                                        </div>
                                    </div>
                                ) : (
                                     <div className="mt-1">
                                         <div className="text-sm font-medium">
                                             {field.displayValue || '-'}
                                         </div>
                                     </div>
                                 )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </ConfirmationDialog>
    );
};

export default SmartChangeConfirmation;
