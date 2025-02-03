'use client';

import React, { useCallback } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { useFieldVisibility } from '../hooks/form-related/useFieldVisibility';
import { useFieldRenderer } from '../hooks/form-related/useFieldRenderer';
import { getFormStyle } from './formUtils';
import { ComponentDensity, EntityKeys, MatrxRecordId } from '@/types';
import EntityFormFooter from './form-helpers/EntityFormFooter';

interface EntityFormMinimalAnyRecordProps {
    recordId: MatrxRecordId;
    unifiedLayoutProps: UnifiedLayoutProps;
    onFieldChange?: (fieldName: string, value: unknown) => void;
}

const LOCAL_OVERRIDES = {
    density: 'compact' as ComponentDensity,
};

export const EntityFormMinimalAnyRecord = <TEntity extends EntityKeys>({ 
    recordId, 
    unifiedLayoutProps,
    onFieldChange 
}: EntityFormMinimalAnyRecordProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const showRelatedFields = true;
    const density = LOCAL_OVERRIDES.density;
    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields } = fieldVisibility;

    const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
        onFieldChange?.(fieldName, value);
    }, [onFieldChange]);

    const { getNativeFieldComponent } = useFieldRenderer<TEntity>(
        entityKey, 
        recordId, 
        unifiedLayoutProps,
        { onFieldChange: handleFieldChange }
    );

    return (
        <div className={getFormStyle('form', density)}>
            <div className={getFormStyle('fieldsWrapper', density)}>
                {visibleNativeFields.length > 0 && (
                    <div className={getFormStyle('nativeFieldsMinimal', density)}>
                        {visibleNativeFields.map(getNativeFieldComponent)}
                    </div>
                )}
            </div>
            <div className={getFormStyle('footer', density)}>
                <EntityFormFooter
                    entityKey={entityKey}
                    recordId={recordId}
                    density={density}
                    unifiedLayoutProps={unifiedLayoutProps}
                    crudOptions={{
                        allowCreate: false,
                        allowEdit: true,
                        allowDelete: true,
                        allowRefresh: true,
                        allowAdvanced: true,
                    }}
                    crudLayout={{
                        buttonLayout: 'row',
                        buttonSize: 'icon',
                        buttonsPosition: 'top',
                        buttonSpacing: 'compact',
                    }}
                />
            </div>
        </div>
    );
};

export default EntityFormMinimalAnyRecord;