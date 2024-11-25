'use client';

import React, {useState, useCallback, useMemo} from 'react';
import {useEntity} from '@/lib/redux/entity/useEntity';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {ArmaniFormProps, EntityFlexFormField} from "@/components/matrx/Entity/types/entityForm";
import {FormLoadingTwoColumn} from "@/components/matrx/LoadingComponents";
import {EntityStateField, MatrxRecordId} from '@/lib/redux/entity/types';
import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    FormColumnOptions, FormDirectionOptions,
    FormLayoutOptions
} from '@/types/componentConfigTypes';
import ArmaniForm from "@/components/matrx/ArmaniForm/ArmaniForm";

export interface EntityContentProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    className?: string;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    formOptions?: {
        size?: ComponentSize;
        formLayout?: FormLayoutOptions;
        formColumns?: FormColumnOptions;
        formDirection?: FormDirectionOptions;
        formEnableSearch?: boolean;
        formIsSinglePage?: boolean;
        formIsFullPage?: boolean;
        floatingLabel?: boolean;
    };
}

// Memoized form configuration
const createFormConfig = (formOptions?: EntityContentProps<any>['formOptions']) => ({
    layout: formOptions?.formLayout ?? 'grid',
    direction: formOptions?.formDirection ?? 'row',
    enableSearch: false,  // TODO: Hard-coded to False for now
    columns: formOptions?.formColumns ?? 2,
    isSinglePage: formOptions?.formIsSinglePage ?? true,
    isFullPage: formOptions?.formIsFullPage ?? true,
    floatingLabel: formOptions?.floatingLabel ?? true,
});

function EntityContent<TEntity extends EntityKeys>(
    {
        entityKey,
        className,
        density,
        animationPreset,
        formOptions
    }: EntityContentProps<TEntity>) {
    const entity = useEntity(entityKey);
    const [formData, setFormData] = useState<EntityData<EntityKeys>>({});
    const [isLoading, setIsLoading] = useState(true);

    const getMatrxRecordId = useCallback(() => {
        if (!entity.activeRecord || !entity.primaryKeyMetadata) return null;

        return entity.matrxRecordIdByPrimaryKey(
            entity.primaryKeyMetadata.fields.reduce(
                (acc, field) => ({
                    ...acc,
                    [field]: entity.activeRecord[field],
                }),
                {} as Record<string, MatrxRecordId>
            )
        );
    }, [entity.activeRecord, entity.primaryKeyMetadata]);

    // Memoize field update handler
    const handleFieldUpdate = useCallback((fieldName: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    }, []);

    // Memoize CRUD handlers
    const handleUpdate = useCallback((data: EntityData<EntityKeys>) => {
        const matrxRecordId = getMatrxRecordId();
        if (!matrxRecordId) return;

        entity.updateRecord(
            matrxRecordId,
            data,
            { showToast: true }
        );
    }, [entity, getMatrxRecordId]);

    const handleCreate = useCallback((data: EntityData<EntityKeys>) => {
        entity.createRecord(
            data,
            { showToast: true }
        );
    }, [entity]);

    const handleDelete = useCallback(() => {
        const matrxRecordId = getMatrxRecordId();
        if (!matrxRecordId) return;

        entity.deleteRecord(
            matrxRecordId,
            { showToast: true }
        );
    }, [entity, getMatrxRecordId]);

    // Memoize the form configuration
    const formConfig = useMemo(() => createFormConfig(formOptions), [formOptions]);

    // Split formProps into stable and dynamic parts
    const stableFormProps = useMemo(() => ({
        entityKey,
        onUpdateField: handleFieldUpdate,
        onSubmitUpdate: handleUpdate,
        onSubmitCreate: handleCreate,
        onSubmitDelete: handleDelete,
        ...formConfig,
        ...(formOptions?.size && {size: formOptions.size}),
        ...(animationPreset && {animationPreset}),
        ...(density && { density }),
    }), [
        entityKey,
        handleFieldUpdate,
        handleUpdate,
        handleCreate,
        handleDelete,
        formConfig,
        formOptions?.size,
        animationPreset,
        density,
    ]);

    React.useEffect(() => {
        setIsLoading(entity.loadingState.loading);
        if (entity.activeRecord) {
            setFormData(entity.activeRecord);
            setIsLoading(false);
        }
    }, [entity.activeRecord, entity.loadingState]);

    if (!entity.entityMetadata) return <FormLoadingTwoColumn/>;
    if (entity.loadingState.error) {
        return (
            <div className="p-4 text-red-500">
                Error: {entity.loadingState.error.message}
            </div>
        );
    }
    if (isLoading) return <FormLoadingTwoColumn/>;
    if (!entity.activeRecord) return null;

    return (
        <div className={className || "p-2"}>
            <ArmaniForm
                {...stableFormProps}
                formData={formData}
            />
        </div>
    );
}


export default React.memo(EntityContent, (prevProps, nextProps) => {
    return prevProps.entityKey === nextProps.entityKey &&
        prevProps.className === nextProps.className &&
        prevProps.density === nextProps.density &&
        prevProps.animationPreset === nextProps.animationPreset &&
        JSON.stringify(prevProps.formOptions) === JSON.stringify(nextProps.formOptions);
});
