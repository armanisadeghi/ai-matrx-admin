'use client';

import React, { useMemo } from 'react';
import SmartCrudButtons from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { getFormStyle } from './formUtils';
import FieldSelectionControls from './form-helpers/FieldSelectionControls';
import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { useRenderedFields } from '../hooks/form-related/useRenderedFields';
import { ComponentDensity } from '@/types/componentConfigTypes';

interface EntityFormMinimalAnyRecordProps {
    recordId: MatrxRecordId;
    unifiedLayoutProps: UnifiedLayoutProps;
}

const LOCAL_OVERRIDES = {
    density: 'compact' as ComponentDensity,
};

const EntityFormAnyRecordWithRelated = <TEntity extends EntityKeys>({ recordId, unifiedLayoutProps }: EntityFormMinimalAnyRecordProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const density = useMemo(() => unifiedLayoutProps.dynamicStyleOptions?.density || 'normal', [unifiedLayoutProps.dynamicStyleOptions]);
    
    const {
        nativeFields,
        relationshipFields,
        visibleFieldsInfo
    } = useRenderedFields(unifiedLayoutProps, {
        showRelatedFields: true,
    });

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
                    fieldVisibility={visibleFieldsInfo}
                    showControls={false}
                />
            </div>

            <div className={getFormStyle('fieldsWrapper', density)}>
                {nativeFields.length > 0 && (
                    <div className={getFormStyle('nativeFields', density)}>{nativeFields}</div>
                )}

                {relationshipFields.length > 0 && (
                    <div className={getFormStyle('relationshipFields', density)}>{relationshipFields}</div>
                )}
            </div>
        </div>
    );
};

export default EntityFormAnyRecordWithRelated;
