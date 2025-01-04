'use client';

import React, { useMemo } from 'react';
import SmartCrudButtons from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { getFormStyle } from '../formUtils';
import FieldSelectionControls from '../form-helpers/FieldSelectionControls';
import { EntityKeys } from '@/types/entityTypes';
import { useFieldVisibility } from '../../hooks/form-related/useFieldVisibility';
import { useFieldRenderer } from '../../hooks/form-related/useFieldRenderer';

const ArmaniFormFinal = <TEntity extends EntityKeys>(unifiedLayoutProps: UnifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const showRelatedFields = true;
    const density = useMemo(
        () => unifiedLayoutProps.dynamicStyleOptions?.density || 'normal',
        [unifiedLayoutProps.dynamicStyleOptions]
    );
    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields, visibleRelationshipFields } = fieldVisibility;
    
    const { getNativeFieldComponent, getRelationshipFieldComponent } = useFieldRenderer<TEntity>(
        entityKey,
        activeRecordId,
        unifiedLayoutProps
    );    

    return (
        <div className={getFormStyle('form', density)}>
            <div className={getFormStyle('header', density)}>
            <FieldSelectionControls fieldVisibility={fieldVisibility} showControls={false} />
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
            </div>

            <div className={getFormStyle('fieldsWrapper', density)}>
                {visibleNativeFields.length > 0 && (
                    <div className={getFormStyle('nativeFields', density)}>
                        {visibleNativeFields.map(getNativeFieldComponent)}
                    </div>
                )}

                {visibleRelationshipFields.length > 0 && (
                    <div className={getFormStyle('relationshipFields', density)}>
                        {visibleRelationshipFields.map(getRelationshipFieldComponent)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArmaniFormFinal;