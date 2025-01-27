'use client';

import React, { useEffect } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { useFieldVisibility } from '../hooks/form-related/useFieldVisibility';
import { FieldRendererOptions, useFieldRenderer } from '../hooks/form-related/useFieldRenderer';
import { getFormStyle } from './formUtils';
import { ComponentDensity, EntityKeys, MatrxRecordId } from '@/types';
import EntityFormFooter from './form-helpers/EntityFormFooter';
import { useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { boolean } from 'zod';

interface EntityFormMinimalAnyRecordProps {
    recordId: MatrxRecordId;
    unifiedLayoutProps: UnifiedLayoutProps;
    fieldOptions?: FieldRendererOptions;
    avoidViewMode?: boolean;
    showRelatedFields?: boolean;
    density?: ComponentDensity;
}

const LOCAL_OVERRIDES = {
    density: 'compact' as ComponentDensity,
};

export const EntityFormCustomMinimal = <TEntity extends EntityKeys>({
    recordId,
    unifiedLayoutProps,
    fieldOptions,
    avoidViewMode = false,
    showRelatedFields = true,
    density = LOCAL_OVERRIDES.density,
}: EntityFormMinimalAnyRecordProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const dispatch = useAppDispatch();
    const { actions, selectors } = useEntityTools(entityKey);
    const operationMode = useAppSelector(selectors.selectEntityOperationMode);

    useEffect(() => {
        if (recordId && recordId.startsWith('new-record-')) {
            dispatch(actions.startRecordCreation({count: 1}));
        } else {
            if (avoidViewMode) {
                dispatch(actions.setOperationMode('update'));
            }
        }
    }, [operationMode, recordId, dispatch, actions]);

    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields } = fieldVisibility;

    const { getNativeFieldComponent } = useFieldRenderer<TEntity>(entityKey, recordId, unifiedLayoutProps, fieldOptions);

    return (
        <div className={getFormStyle('form', density)}>
            <div className={`${getFormStyle('fieldsWrapper', density)} pb-6`}>
                {visibleNativeFields.length > 0 && (
                    <div className={getFormStyle('nativeFieldsMinimal', density)}>{visibleNativeFields.map(getNativeFieldComponent)}</div>
                )}
            </div>
            <div className={getFormStyle('footer', density)}>
                <EntityFormFooter
                    entityKey={entityKey}
                    recordId={recordId}
                    density={density}
                    unifiedLayoutProps={unifiedLayoutProps}
                    crudOptions={{
                        allowCreate: true,
                        allowEdit: true,
                        allowDelete: true,
                        allowRefresh: false,
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

export default EntityFormCustomMinimal;
