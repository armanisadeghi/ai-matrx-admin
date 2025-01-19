'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { getFormStyle } from './formUtils';
import FieldSelectionControls from './form-helpers/FieldSelectionControls';
import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { useFieldVisibility } from '../hooks/form-related/useFieldVisibility';
import { useFieldRenderer } from '../hooks/form-related/useFieldRenderer';
import { useAppSelector, useEntityTools } from '@/lib/redux';
import { useCreateRecord } from '../hooks/unsaved-records/useCreateRecord';
import { Button } from '@/components/ui';

interface EntityFormCreateRecordWithRelatedProps {
    unifiedLayoutProps: UnifiedLayoutProps;
    showRelatedFields?: boolean;
    showFieldSelectionControls?: boolean;
    postCreationOptions?: boolean;
    children?: React.ReactNode;
    onCreateSuccess?: () => void;
    onCreateError?: (error: Error) => void;
}

const EntityFormCreateRecordWithRelated = <TEntity extends EntityKeys>({
    unifiedLayoutProps,
    showRelatedFields = true,
    showFieldSelectionControls = false,
    postCreationOptions = false,
    children,
    onCreateSuccess,
    onCreateError,
}: EntityFormCreateRecordWithRelatedProps) => {
    const [previousActiveRecordId, setPreviousActiveRecordId] = React.useState<MatrxRecordId | null>(null);
    const [isRecordCreated, setIsRecordCreated] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const { actions, selectors, dispatch, store } = useEntityTools(entityKey);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);

    useEffect(() => {
        if (activeRecordId) {
            setPreviousActiveRecordId(activeRecordId);
        }
        dispatch(actions.startRecordCreation({ count: 1 }));

        return () => {
            if (previousActiveRecordId) {
                dispatch(actions.setActiveRecordSmart(previousActiveRecordId));
            }
        };
    }, []);

    const { createRecord } = useCreateRecord(entityKey, {
        onSuccess: onCreateSuccess,
        onError: onCreateError
    });

    const handleSave = useCallback(async () => {
        if (!activeRecordId) return;
        setIsCreating(true);
        try {
            await createRecord(activeRecordId);
            setPreviousActiveRecordId(activeRecordId);
            setIsRecordCreated(true);
        } catch (error) {
            // Error handling is now done through the hook callbacks
            console.error('Error creating record:', error);
        } finally {
            setIsCreating(false);
        }
    }, [activeRecordId, createRecord]);

    const density = useMemo(() => unifiedLayoutProps.dynamicStyleOptions?.density || 'normal', [unifiedLayoutProps.dynamicStyleOptions]);
    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields, visibleRelationshipFields } = fieldVisibility;
    const { getNativeFieldComponent, getRelationshipFieldComponent } = useFieldRenderer<TEntity>(entityKey, activeRecordId, unifiedLayoutProps);

    return (
        <div className={getFormStyle('form', density)}>
            <div className={getFormStyle('header', density)}>
                {showFieldSelectionControls && (
                    <FieldSelectionControls
                        fieldVisibility={fieldVisibility}
                        showControls={false}
                    />
                )}
            </div>

            <div className={getFormStyle('fieldsWrapper', density)}>
                {visibleNativeFields.length > 0 && (
                    <div className={getFormStyle('nativeFields', density)}>{visibleNativeFields.map(getNativeFieldComponent)}</div>
                )}
                
                {(!postCreationOptions || !isRecordCreated) && (
                    <Button 
                        onClick={handleSave}
                        disabled={isCreating}
                    >
                        {isCreating ? 'Saving...' : 'Save'}
                    </Button>
                )}

                {postCreationOptions && isRecordCreated && children}

                {visibleRelationshipFields.length > 0 && (
                    <div className={getFormStyle('relationshipFields', density)}>{visibleRelationshipFields.map(getRelationshipFieldComponent)}</div>
                )}
            </div>
        </div>
    );
};

export default EntityFormCreateRecordWithRelated;