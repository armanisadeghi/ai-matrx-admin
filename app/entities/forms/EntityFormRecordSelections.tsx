'use client';

import React, { useMemo } from 'react';
import SmartCrudButtons from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { useFieldVisibility } from '../hooks/form-related/useFieldVisibility';
import { getFormStyle } from './formUtils';
import { ComponentDensity, EntityKeys, MatrxRecordId } from '@/types';
import { useFieldRenderer } from '../hooks/form-related/useFieldRenderer';

interface EntityFormMinimalAnyRecordProps {
    recordId: MatrxRecordId;
    unifiedLayoutProps: UnifiedLayoutProps;
}

const LOCAL_OVERRIDES = {
    density: 'compact' as ComponentDensity,
};

const EntityFormMinimalAnyRecord = <TEntity extends EntityKeys>({ recordId, unifiedLayoutProps }: EntityFormMinimalAnyRecordProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const showRelatedFields = true;
    const density = LOCAL_OVERRIDES.density;
    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields } = fieldVisibility;

    const { getNativeFieldComponent } = useFieldRenderer<TEntity>(entityKey, recordId, unifiedLayoutProps);

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
                    <div className={getFormStyle('nativeFieldsMinimal', density)}>{visibleNativeFields.map(getNativeFieldComponent)}</div>
                )}
            </div>
        </div>
    );
};

const EntityFormRecordSelections = <TEntity extends EntityKeys>(unifiedLayoutProps: UnifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);

    if (!selectedRecordIds?.length) {
        return null;
    }

    return (
        <div className='w-full space-y-4'>
            {selectedRecordIds.map((recordId) => (
                <EntityFormMinimalAnyRecord<TEntity>
                    key={recordId}
                    recordId={recordId}
                    unifiedLayoutProps={unifiedLayoutProps}
                />
            ))}
        </div>
    );
};

export { EntityFormMinimalAnyRecord, EntityFormRecordSelections };
