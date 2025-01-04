import {useMemo, useCallback} from "react";
import {EntityKeys} from "@/types/entityTypes";
import ConfirmationDialog from "./ConfirmationDialog";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import {cn} from "@/lib/utils";
import {useEntityToasts} from "@/lib/redux/entity/hooks/useEntityToasts";
import {FlexibleQueryOptions} from "@/lib/redux/entity/types/stateTypes";
import {Callback, callbackManager} from "@/utils/callbackManager";
import {getEntitySlice} from "@/lib/redux";

interface SmartCreateConfirmationProps {
    entityKey: EntityKeys;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type CreateResult = {
    success: boolean;
    error?: unknown;
};

export const SmartCreateConfirmation = (
    {
        entityKey,
        open,
        onOpenChange,
    }: SmartCreateConfirmationProps) => {
    const dispatch = useAppDispatch();
    const {actions} = useMemo(() => getEntitySlice(entityKey), [entityKey]);
    const entityToasts = useEntityToasts(entityKey);
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const comparison = useAppSelector(selectors.selectChangeComparison);

    const handleComplete = useCallback<Callback<CreateResult>>(({success, error}) => {
        if (success) {
            entityToasts.handleCreateSuccess();
            onOpenChange(false);
        } else {
            entityToasts.handleError(error, 'create');
        }
    }, [entityToasts, onOpenChange]);

    const handleCreate = useCallback((createPayloadArray: FlexibleQueryOptions[]) => {
        createPayloadArray.forEach(createPayload => {
            dispatch(actions.addPendingOperation(createPayload.tempRecordId));

            dispatch(actions.createRecord({
                ...createPayload,
                callbackId: callbackManager.register((result: CreateResult) => {
                    dispatch(actions.removePendingOperation(createPayload.tempRecordId));
                    handleComplete(result);
                })
            }));
        });
    }, [dispatch, actions, handleComplete]);

    const handleConfirm = useCallback(() => {
        if (!comparison.matrxRecordId) return;

        const createPayload: FlexibleQueryOptions = {
            entityNameAnyFormat: entityKey,
            tempRecordId: comparison.matrxRecordId,
            data: comparison.changedFieldData
        };

        handleCreate([createPayload]);
    }, [comparison.matrxRecordId, comparison.changedFieldData, entityKey, handleCreate]);

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Create New Record"
            onConfirm={handleConfirm}
            onCancel={() => onOpenChange(false)}
            confirmText="Create"
            intent="default"
        >
            <div>
                {/* Table Header */}
                <div className="grid grid-cols-3 gap-4 mb-4 px-4 py-2 bg-muted/50 rounded-md">
                    <div className="text-sm font-medium text-muted-foreground">Field</div>
                    <div className="text-sm font-medium text-muted-foreground">Value</div>
                    <div className="text-sm font-medium text-muted-foreground text-right">Status</div>
                </div>

                {/* Table Content */}
                <div className="space-y-2">
                    {comparison.fieldInfo.map(field => (
                        <div
                            key={field.name}
                            className="grid grid-cols-3 gap-4 px-4 py-3 hover:bg-muted/50 rounded-md"
                        >
                            <div className="text-sm font-medium">
                                {field.displayName}
                            </div>
                            <div className="text-sm text-primary">
                                {field.newValue ?? 'BLANK'}
                            </div>
                            <div className="text-right">
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    New
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ConfirmationDialog>
    );
};

export default SmartCreateConfirmation;
