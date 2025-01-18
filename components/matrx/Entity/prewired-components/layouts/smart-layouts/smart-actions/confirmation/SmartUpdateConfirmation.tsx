import React from "react";
import { EntityKeys } from "@/types/entityTypes";
import ConfirmationDialog from "./ConfirmationDialog";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useEntityTools } from "@/lib/redux";
import { useCallback } from "react";
import { useUpdateRecord } from "@/app/entities/hooks/crud/useUpdateRecord";
import { formatFieldValue } from "./utils";

interface SmartUpdateConfirmationProps {
    entityKey: EntityKeys;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SmartUpdateConfirmation = ({
    entityKey,
    open,
    onOpenChange,
}: SmartUpdateConfirmationProps) => {
    const { selectors } = useEntityTools(entityKey);
    const comparison = useAppSelector(selectors.selectChangeComparison);
    const { updateRecord } = useUpdateRecord(entityKey, () => onOpenChange(false));

    const handleConfirm = useCallback(() => {
        if (!comparison.matrxRecordId) return;
        updateRecord(comparison.matrxRecordId);
    }, [comparison, updateRecord]);

    if (!comparison.hasChanges) {
        return null;
    }

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title={`Save Changes${comparison.displayName ? ` - ${comparison.displayName}` : ''} [UPDATE DIALOG]`}
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
            confirmText="Save"
            intent="default"
        >
            <div className="space-y-2 -p-3">
                <div className="grid grid-cols-1 gap-2">
                    {comparison.fieldInfo
                        .filter(field => comparison.changedFields.has(field.name))
                        .map(field => (
                            <div
                                key={field.name}
                                className={cn(
                                    "rounded-md p-1",
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
                                        <span className="text-xs text-muted-foreground">Original Value</span>
                                        <div className="font-medium whitespace-pre-wrap font-mono text-xs">
                                            {formatFieldValue(field.originalValue)}
                                        </div>
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <span className="text-xs text-muted-foreground">Updated Value</span>
                                        <div className="font-medium text-primary whitespace-pre-wrap font-mono text-xs">
                                            {formatFieldValue(field.newValue)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </ConfirmationDialog>
    );
};

export default SmartUpdateConfirmation;