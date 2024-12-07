'use client';

import React, {useCallback} from 'react';
import {Button} from '@/components/ui/button';
import {Plus} from 'lucide-react';
import {useEntityToasts} from '@/lib/redux/entity/hooks/useEntityToasts';
import {CreateEntityButtonProps} from ".";
import { useEntity } from '@/lib/redux/entity/hooks/useEntity';

export const CreateEntityButton = (
    {
        entityKey,
        data,
        className = '',
        children,
        onSuccess,
        ...props
    }: CreateEntityButtonProps) => {
    const entity = useEntity(entityKey);
    const toasts = useEntityToasts(entityKey);

    const handleCreateRecord = useCallback(() => {
        entity.createRecord(data, (result) => {
            if (result.success) {
                toasts.handleCreateSuccess({showToast: true});
                onSuccess?.();
            } else {
                toasts.handleError(result.error, 'create', {showToast: true});
            }
        });
    }, [entity, data, onSuccess, toasts]);

    return (
        <Button
            onClick={handleCreateRecord}
            className={`bg-green-600 hover:bg-green-700 ${className}`}
            {...props}
        >
            <Plus className="w-4 h-4 mr-2"/>
            {children || 'Create'}
        </Button>
    );
};

export default CreateEntityButton;
