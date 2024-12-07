import React, {useCallback} from 'react';
import {Button} from '@/components/ui/button';
import {Trash} from 'lucide-react';
import {useEntity} from '@/lib/redux/entity/hooks/useEntity';
import {useEntityToasts} from '@/lib/redux/entity/hooks/useEntityToasts';
import {MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {DeleteEntityButtonProps} from ".";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppSelector} from "@/lib/redux/hooks";

export const DeleteEntityButton = (
    {
        entityKey,
        recordId,
        onSuccess,
        confirmTitle,
        confirmDescription,
        className,
        children,
        ...props
    }: DeleteEntityButtonProps) => {
    const entity = useEntity(entityKey);
    const toasts = useEntityToasts(entityKey);
    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);

    const handleDelete = useCallback(() => {
        entity.deleteRecord(
            activeRecordId,
            (result) => {
                if (result.success) {
                    toasts.handleDeleteSuccess({showToast: true});
                    onSuccess?.();
                } else {
                    toasts.handleError(result.error, 'delete', {showToast: true});
                }
            }
        );
    }, [entity, onSuccess, toasts, activeRecordId]);

    const entityName = entityKey.charAt(0).toUpperCase() + entityKey.slice(1).toLowerCase();
    const defaultConfirmTitle = `Delete ${entityName}`;
    const defaultConfirmDescription = `Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    className={className}
                    disabled={!entity.activeRecord}
                    {...props}
                >
                    <Trash className="w-4 h-4 mr-2"/>
                    {children || 'Delete'}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {confirmTitle || defaultConfirmTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {confirmDescription || defaultConfirmDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeleteEntityButton;


/*
// Example usage of all buttons together
export const EntityActions = ({
                                  entityKey,
                                  data,
                                  onSuccess,
                                  deleteConfirmTitle,
                                  deleteConfirmDescription
                              }) => {
    return (
        <div className="flex gap-2">
            <CreateEntityButton
                entityKey={entityKey}
                data={data}
                onSuccess={onSuccess}
            />
            <UpdateEntityButton
                entityKey={entityKey}
                data={data}
                onSuccess={onSuccess}
            />
            <DeleteEntityButton
                entityKey={entityKey}
                onSuccess={onSuccess}
                confirmTitle={deleteConfirmTitle}
                confirmDescription={deleteConfirmDescription}
            />
        </div>
    );
};*/
