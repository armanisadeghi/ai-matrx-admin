'use client';

import React, { useEffect } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { useFieldVisibility } from '../hooks/form-related/useFieldVisibility';
import { FieldRendererOptions, useFieldRenderer } from '../hooks/form-related/useFieldRenderer';
import { getFormStyle } from './formUtils';
import { ComponentDensity, ComponentSize, EntityKeys, MatrxRecordId } from '@/types';
import EntityFormFooter from './form-helpers/EntityFormFooter';
import { useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { CrudButtonOptions, CrudLayout } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper';

interface EntityFormMinimalAnyRecordProps {
    recordId: MatrxRecordId;
    unifiedLayoutProps: UnifiedLayoutProps;
    fieldOptions?: FieldRendererOptions;
    avoidViewMode?: boolean;
    showRelatedFields?: boolean;
    density?: ComponentDensity;
    crudOptionsOverride?: CrudButtonOptions;
    crudLayoutOverride?: CrudLayout;
}

const LOCAL_OVERRIDES = {
    density: 'compact' as ComponentDensity,
};

const DEFAULT_CRUD_OPTIONS: CrudButtonOptions = {
    allowCreate: false,
    allowEdit: true,
    allowDelete: true,
    allowAdvanced: true,
    allowRefresh: true,
    forceEnable: false,
};

const DEFAULT_CRUD_LAYOUT: CrudLayout = {
    buttonLayout: 'row',
    buttonSize: 'icon',
    buttonsPosition: 'top',
    buttonSpacing: 'normal',
};

export const EntityFormCustomMinimal = <TEntity extends EntityKeys>({
    recordId,
    unifiedLayoutProps,
    fieldOptions,
    avoidViewMode = false,
    showRelatedFields = true,
    density = LOCAL_OVERRIDES.density,
    crudOptionsOverride,
    crudLayoutOverride,
}: EntityFormMinimalAnyRecordProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity as TEntity | null;
    const dispatch = useAppDispatch();
    const { actions, selectors } = useEntityTools(entityKey);
    const operationMode = useAppSelector(selectors.selectEntityOperationMode);

    useEffect(() => {
        if (recordId && recordId.startsWith('new-record-')) {
            dispatch(actions.startRecordCreation({count: 1}));
            console.log('Record creation started');
        } else {
            if (avoidViewMode) {
                console.log('Setting operation mode to update');
                dispatch(actions.setOperationMode('update'));
            }
        }
    }, [operationMode, recordId, dispatch, actions]);

    const fieldVisibility = useFieldVisibility(entityKey, unifiedLayoutProps, showRelatedFields);
    const { visibleNativeFields } = fieldVisibility;

    const { getNativeFieldComponent } = useFieldRenderer<TEntity>(entityKey, recordId, unifiedLayoutProps, fieldOptions);

    // Merge default options with overrides
    const finalCrudOptions: CrudButtonOptions = {
        ...DEFAULT_CRUD_OPTIONS,
        forceEnable: fieldOptions?.forceEnable || DEFAULT_CRUD_OPTIONS.forceEnable,
        ...crudOptionsOverride,
    };

    const finalCrudLayout: CrudLayout = {
        ...DEFAULT_CRUD_LAYOUT,
        ...crudLayoutOverride,
    };

    return (
        <div className={getFormStyle('form', density)}>
            <div className={`${getFormStyle('fieldsWrapper', density)} pb-6`}>
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
                    crudOptions={finalCrudOptions}
                    crudLayout={finalCrudLayout}
                />
            </div>
        </div>
    );
};

export default EntityFormCustomMinimal;