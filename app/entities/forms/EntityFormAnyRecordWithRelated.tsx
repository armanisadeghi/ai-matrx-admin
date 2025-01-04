'use client';

import React, { useMemo } from 'react';
import SmartCrudButtons from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { getFormStyle } from './formUtils';
import FieldSelectionControls from './form-helpers/FieldSelectionControls';
import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { useFieldVisibility } from '../hooks/form-related/useFieldVisibility';
import { useFieldRenderer } from '../hooks/form-related/useFieldRenderer';
import { ComponentDensity } from '@/types';

interface EntityFormMinimalAnyRecordProps {
    recordId: MatrxRecordId;
    unifiedLayoutProps: UnifiedLayoutProps;
}

const LOCAL_OVERRIDES = {
    density: 'compact' as ComponentDensity,
};

const EntityFormAnyRecordWithRelated = <TEntity extends EntityKeys>({ recordId, unifiedLayoutProps }: EntityFormMinimalAnyRecordProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const showRelatedFields = true;
    const density = useMemo(() => unifiedLayoutProps.dynamicStyleOptions?.density || 'normal', [unifiedLayoutProps.dynamicStyleOptions]);
    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields, visibleRelationshipFields } = fieldVisibility;
    const { getNativeFieldComponent, getRelationshipFieldComponent } = useFieldRenderer<TEntity>(entityKey, recordId, unifiedLayoutProps);

    return (
        <div
            className={getFormStyle('form', density)}
        >
            <div className={getFormStyle('header', density)}>
                <SmartCrudButtons
                    entityKey={entityKey}
                    options={{
                        allowCreate: true,
                        allowEdit: true,
                        allowDelete: true,
                    }}
                    layout={{
                        buttonLayout: 'row',
                        buttonSize: 'icon',
                    }}
                />
                <FieldSelectionControls
                    fieldVisibility={fieldVisibility}
                    showControls={false}
                />
            </div>

            <div className={getFormStyle('fieldsWrapper', density)}>
                {visibleNativeFields.length > 0 && (
                    <div className={getFormStyle('nativeFields', density)}>{visibleNativeFields.map(getNativeFieldComponent)}</div>
                )}

                {visibleRelationshipFields.length > 0 && (
                    <div className={getFormStyle('relationshipFields', density)}>{visibleRelationshipFields.map(getRelationshipFieldComponent)}</div>
                )}
            </div>
        </div>
    );
};

export default EntityFormAnyRecordWithRelated;
