'use client';

import React, { useCallback, useMemo } from 'react';
import EntityRelationshipWrapperFinal from '@/app/entities/relationships/EntityRelationshipWrapperFinal';
import SmartCrudButtons from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import EntityBaseFieldFinal from '@/app/entities/fields/EntityBaseFieldFinal';
import { getFormStyle } from './formUtils';
import FieldSelectionControls from './form-helpers/FieldSelectionControls';
import { EntityAnyFieldKey } from '@/types/entityTypes';
import { useFieldVisibility } from '../hooks/form-related/useFieldVisibility';

const EntityFormStandard: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
    const showRelatedFields = true;

    const density = useMemo(() => unifiedLayoutProps.dynamicStyleOptions?.density || 'normal', [unifiedLayoutProps.dynamicStyleOptions]);

    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields, visibleRelationshipFields } = fieldVisibility;

    const renderNativeField = useCallback(
        (fieldName: EntityAnyFieldKey<typeof entityKey>) => (
            <div
                key={`${activeRecordId}-${fieldName}-native`}
                className='w-full'
            >
                <EntityBaseFieldFinal
                    fieldName={fieldName}
                    recordId={activeRecordId}
                    entityKey={entityKey}
                    unifiedLayoutProps={unifiedLayoutProps}
                />
            </div>
        ),
        [entityKey, activeRecordId, unifiedLayoutProps]
    );

    const renderRelationshipField = useCallback(
        (fieldName: EntityAnyFieldKey<typeof entityKey>) => (
            <div
                key={`${activeRecordId}-${fieldName}-relationship`}
                className='w-full'
            >
                <EntityRelationshipWrapperFinal
                    fieldName={fieldName}
                    recordId={activeRecordId}
                    entityKey={entityKey}
                    unifiedLayoutProps={unifiedLayoutProps}
                />
            </div>
        ),
        [entityKey, activeRecordId, unifiedLayoutProps]
    );

    return (
        <div className={getFormStyle('form', density)}>
            <div className={getFormStyle('header', density)}>
                <FieldSelectionControls
                    fieldVisibility={fieldVisibility}
                    showControls={false}
                />
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
                {visibleNativeFields.length > 0 && <div className={getFormStyle('nativeFields', density)}>{visibleNativeFields.map(renderNativeField)}</div>}

                {visibleRelationshipFields.length > 0 && (
                    <div className={getFormStyle('relationshipFields', density)}>{visibleRelationshipFields.map(renderRelationshipField)}</div>
                )}
            </div>
        </div>
    );
};

export default EntityFormStandard;
