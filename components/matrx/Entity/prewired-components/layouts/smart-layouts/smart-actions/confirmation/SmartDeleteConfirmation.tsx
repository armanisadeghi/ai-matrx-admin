// components/common/crud/SmartDeleteConfirmation.tsx
import {EntityKeys} from "@/types/entityTypes";
import {useEntityCrud} from "@/lib/redux/entity/hooks/useEntityCrud";
import {useCallback, useMemo} from "react";
import ConfirmationDialog from "./ConfirmationDialog";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppSelector} from "@/lib/redux/hooks";

interface SmartDeleteConfirmationProps {
    entityKey: EntityKeys;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete?: (success: boolean) => void;
}

export const SmartDeleteConfirmation = (
    {
        entityKey,
        open,
        onOpenChange,
        onComplete
    }: SmartDeleteConfirmationProps) => {
    const entityCrud = useEntityCrud(entityKey);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const comparison = useAppSelector(selectors.selectChangeComparison);
    const {handleDelete, activeRecordId} = entityCrud;

    const handleConfirm = useCallback(() => {
        if (!activeRecordId) return;

        handleDelete(activeRecordId, (result) => {
            if (result.success) {
                onOpenChange(false);
                onComplete?.(true);
            } else {
                console.error('Delete operation failed:', result.error);
                onComplete?.(false);
            }
        });
    }, [activeRecordId, handleDelete, onOpenChange, onComplete]);

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={`Delete ${comparison.displayName || 'Record'}`}
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
            confirmText="Delete"
            intent="destructive"
        >
            <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                    Are you sure you want to delete this record? This action cannot be undone.
                </div>

                <div className="rounded-md border p-4 bg-muted/50">
                    <div className="text-sm font-medium mb-2">Record Details:</div>
                    <div className="grid grid-cols-1 gap-2">
                        {comparison.fieldInfo.map(field => {
                            return (
                                <div key={field.name} className="text-sm">
                                    <span className="font-medium text-muted-foreground">
                                        {field.displayName}:
                                    </span>
                                    {' '}
                                    <span>{comparison.originalRecord?.[field.name] || '-'}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </ConfirmationDialog>
    );
};

export default SmartDeleteConfirmation;
