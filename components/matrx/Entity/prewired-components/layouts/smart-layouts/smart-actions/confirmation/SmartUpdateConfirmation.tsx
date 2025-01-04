import React, {useMemo, useCallback} from "react";
import {EntityKeys} from "@/types/entityTypes";
import ConfirmationDialog from "./ConfirmationDialog";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import {cn} from "@/lib/utils";
import {useEntityToasts} from "@/lib/redux/entity/hooks/useEntityToasts";
import {Callback, callbackManager} from "@/utils/callbackManager";
import {getEntitySlice} from "@/lib/redux";

interface SmartUpdateConfirmationProps {
    entityKey: EntityKeys;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type UpdateResult = {
    success: boolean;
    error?: unknown;
};

export const SmartUpdateConfirmation = (
    {
        entityKey,
        open,
        onOpenChange,
    }: SmartUpdateConfirmationProps) => {
    const dispatch = useAppDispatch();
    const {actions} = useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const entityToasts = useEntityToasts(entityKey);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const comparison = useAppSelector(selectors.selectChangeComparison);

    const handleComplete = useCallback<Callback<UpdateResult>>(({success, error}) => {
        if (!comparison.matrxRecordId) return;

        dispatch(actions.removePendingOperation(comparison.matrxRecordId));

        if (success) {
            entityToasts.handleUpdateSuccess();
            onOpenChange(false);
        } else {
            entityToasts.handleError(error, 'update');
        }
    }, [comparison.matrxRecordId, actions, dispatch, entityToasts, onOpenChange]);

    const handleConfirm = useCallback(() => {
        if (!comparison.matrxRecordId) return;

        dispatch(actions.addPendingOperation(comparison.matrxRecordId));

        dispatch(actions.updateRecord({
            matrxRecordId: comparison.matrxRecordId,
            callbackId: callbackManager.register(handleComplete)
        }));
    }, [comparison.matrxRecordId, actions, dispatch, handleComplete]);

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
                    {comparison.fieldInfo.map(field => {
                        if (!field.hasChanged) return null;

                        return (
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
                                        <div className="font-medium">{field.originalValue || 'BLANK'}</div>
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <span className="text-xs text-muted-foreground">Updated Value</span>
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