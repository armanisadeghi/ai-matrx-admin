'use client';

import React, { useMemo } from 'react';
import SmartCrudButtons from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { getFormStyle } from './formUtils';
import { EntityKeys } from '@/types/entityTypes';
import { useFieldVisibility } from '../hooks/form-related/useFieldVisibility';
import { useFieldRenderer } from '../hooks/form-related/useFieldRenderer';
import { ComponentDensity } from '@/types/componentConfigTypes';


const LOCAL_OVERRIDES = {
    density: 'compact' as ComponentDensity,
}


const EntityFormMinimal = <TEntity extends EntityKeys>(unifiedLayoutProps: UnifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const showRelatedFields = true;
    const density = LOCAL_OVERRIDES.density;
    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields } = fieldVisibility;
    
    const { getNativeFieldComponent } = useFieldRenderer<TEntity>(
        entityKey,
        activeRecordId,
        unifiedLayoutProps
    );


    return (
        <div className={getFormStyle('form', density)}>
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
            </div>

            <div className={getFormStyle('fieldsWrapper', density)}>
                {visibleNativeFields.length > 0 && (
                    <div className={getFormStyle('nativeFieldsMinimal', density)}>
                        {visibleNativeFields.map(getNativeFieldComponent)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EntityFormMinimal;