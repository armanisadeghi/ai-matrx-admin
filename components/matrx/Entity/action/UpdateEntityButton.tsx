import React, {useCallback} from 'react';
import {Button} from '@/components/ui/button';
import {Save} from 'lucide-react';
import {useEntity} from '@/lib/redux/entity/hooks/useEntity';
import {useEntityToasts} from '@/lib/redux/entity/hooks/useEntityToasts';
import {MatrxRecordId} from '@/lib/redux/entity/types/stateTypes';
import {UpdateEntityButtonProps}  from ".";

export const UpdateEntityButton = ({entityKey, recordId, data, onSuccess, className = '', children, ...props}: UpdateEntityButtonProps) => {
    const entity = useEntity(entityKey);
    const toasts = useEntityToasts(entityKey);

    const getMatrxRecordId = useCallback(() => {
        if (!entity.activeRecord || !entity.primaryKeyMetadata) return null;

        return entity.matrxRecordIdByPrimaryKey(
            entity.primaryKeyMetadata.fields.reduce(
                (acc, field) => ({
                    ...acc,
                    [field]: entity.activeRecord[field],
                }),
                {} as Record<string, MatrxRecordId>
            )
        );
    }, [entity.primaryKeyMetadata, entity]);

    const handleUpdate = useCallback(() => {
        const matrxRecordId = getMatrxRecordId();
        if (!matrxRecordId) return;

        entity.updateRecord(
            matrxRecordId,
            data,
            {
                callback: (result) => {
                    if (result.success) {
                        toasts.handleUpdateSuccess({showToast: true});
                        onSuccess?.();
                    } else {
                        toasts.handleError(result.error, 'update', {showToast: true});
                    }
                }
            }
        );
    }, [entity, getMatrxRecordId, data, onSuccess, toasts]);

    return (
        <Button
            onClick={handleUpdate}
            className={`bg-blue-600 hover:bg-blue-700 ${className}`}
            disabled={!entity.activeRecord}
            {...props}
        >
            <Save className="w-4 h-4 mr-2"/>
            {children || 'Update'}
        </Button>
    );
};

export default UpdateEntityButton;
