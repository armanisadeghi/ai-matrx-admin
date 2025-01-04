import React, {useCallback, useMemo} from "react";
import {EntityKeys} from "@/types/entityTypes";
import ConfirmationDialog from "./ConfirmationDialog";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import {getEntitySlice} from "@/lib/redux";
import {Callback, callbackManager} from "@/utils/callbackManager";

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
    const dispatch = useAppDispatch();
    const {actions} = useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);

    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const comparison = useAppSelector(selectors.selectChangeComparison);

    const handleComplete = useCallback<Callback<boolean>>((success) => {
        if (!activeRecordId) return;

        dispatch(actions.removePendingOperation(activeRecordId));
        if (success) {
            onOpenChange(false);
        }
        onComplete?.(success);
    }, [activeRecordId, actions, dispatch, onOpenChange, onComplete]);

    const handleConfirm = useCallback(() => {
        if (!activeRecordId) return;

        dispatch(actions.addPendingOperation(activeRecordId));

        dispatch(actions.deleteRecord({
            matrxRecordId: activeRecordId,
            callbackId: callbackManager.register(handleComplete)
        }));
    }, [activeRecordId, actions, dispatch, handleComplete]);

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
