// SmartDeleteConfirmation.tsx
import React from "react";
import { EntityKeys } from "@/types/entityTypes";
import ConfirmationDialog from "./ConfirmationDialog";
import { useAppSelector } from "@/lib/redux/hooks";
import { useEntityTools } from "@/lib/redux";
import { useCallback } from "react";
import { useDeleteRecord } from "@/app/entities/hooks/crud/useDeleteRecord";

interface SmartDeleteConfirmationProps {
    entityKey: EntityKeys;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete?: (success: boolean) => void;
}

export const SmartDeleteConfirmation = ({
    entityKey,
    open,
    onOpenChange,
    onComplete
}: SmartDeleteConfirmationProps) => {
    const { selectors } = useEntityTools(entityKey);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const comparison = useAppSelector(selectors.selectChangeComparison);

    const handleComplete = useCallback((success: boolean) => {
        if (success) {
            onOpenChange(false);
        }
        onComplete?.(success);
    }, [onOpenChange, onComplete]);

    const { deleteRecord } = useDeleteRecord(entityKey, handleComplete);

    const handleConfirm = useCallback(() => {
        if (!activeRecordId) return;
        deleteRecord(activeRecordId);
    }, [activeRecordId, deleteRecord]);

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

                <div className="rounded-md border p-1 bg-muted/50">
                    <div className="text-sm font-medium mb-2">Record Details:</div>
                    <div className="grid grid-cols-1 gap-2">
                        {comparison.fieldInfo.map(field => (
                            <div key={field.name} className="text-sm">
                                <span className="font-medium text-muted-foreground">
                                    {field.displayName}:
                                </span>
                                {' '}
                                <span>{comparison.originalRecord?.[field.name] || '-'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </ConfirmationDialog>
    );
};

export default SmartDeleteConfirmation;