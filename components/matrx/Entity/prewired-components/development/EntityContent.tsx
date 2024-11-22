'use client';

import React, {useState, useCallback, useMemo} from 'react';
import {useEntity} from '@/lib/redux/entity/useEntity';
import {EntityKeys, EntityData} from '@/types/entityTypes';
import {
    EntityFormState,
    FlexEntityFormProps,
    EntityFlexFormField,
    FormFieldType
} from '@/components/matrx/Entity/types/entityForm';
import {FormLoadingTwoColumn} from "@/components/matrx/LoadingComponents";
import {EntityStateField, MatrxRecordId} from '@/lib/redux/entity/types';
import {
    mapFieldDataTypeToFormFieldType,
    transformFieldsToFormFields
} from "@/components/matrx/Entity/addOns/mapDataTypeToFormFieldType";
import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    FormColumnOptions, FormDirectionOptions,
    FormLayoutOptions
} from '@/types/componentConfigTypes';
import ArmaniForm from "@/components/matrx/ArmaniForm/ArmaniForm";

interface EntityContentProps<TEntity extends EntityKeys> {
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
    };
}

// Memoized field transformation function
const createTransformedFields = (entityFields: EntityStateField[]): EntityFlexFormField[] => {
    if (!entityFields) return [];

    return entityFields.map(field => {
        const transformedField: EntityFlexFormField = {
            name: field.name,
            label: field.displayName || field.name,
            type: mapFieldDataTypeToFormFieldType(field.dataType) as FormFieldType,
            required: field.isRequired,
            disabled: false,
            defaultValue: field.defaultValue,
            validationFunctions: field.validationFunctions,
            maxLength: field.maxLength,
            subComponent: null,
            actionKeys: field.defaultComponent === 'inline-form:1' ? ['entityQuickSidebar'] : [],
            actionProps: {},
            defaultComponent: field.defaultComponent,
            componentProps: field.componentProps,
        };

        return transformedField;
    });
};

// Memoized form configuration
const createFormConfig = (formOptions?: EntityContentProps<any>['formOptions']) => ({
    layout: formOptions?.formLayout ?? 'grid',
    direction: formOptions?.formDirection ?? 'row',
    enableSearch: formOptions?.formEnableSearch ?? false,
    columns: formOptions?.formColumns ?? 2,
    isSinglePage: formOptions?.formIsSinglePage ?? true,
    isFullPage: formOptions?.formIsFullPage ?? true,
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
    const [formData, setFormData] = useState<EntityFormState>({});

    // Memoize the primary key generation
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

    // Sync form data with active record
    React.useEffect(() => {
        if (entity.activeRecord) {
            setFormData(entity.activeRecord as EntityFormState);
        }
    }, [entity.activeRecord]);

    // Memoize transformed fields
    const formFields = useMemo(() =>
            createTransformedFields(entity.fieldInfo),
        [entity.fieldInfo]
    );

    // Memoize form configuration
    const formConfig = useMemo(() =>
            createFormConfig(formOptions),
        [formOptions]
    );

    // Memoize form props
    const formProps: FlexEntityFormProps = useMemo(() => ({
        fields: formFields,
        formState: formData,
        onUpdateField: handleFieldUpdate,
        onSubmitUpdate: handleUpdate,
        onSubmitCreate: handleCreate,
        onSubmitDelete: handleDelete,
        ...formConfig,
        ...(formOptions?.size && {size: formOptions.size}),
        ...(animationPreset && {animationPreset}),
        ...(density && { density }),
    }), [
        formFields,
        formData,
        handleFieldUpdate,
        handleUpdate,
        handleCreate,
        handleDelete,
        formConfig,
        formOptions?.size,
        animationPreset,
        density
    ]);

    if (!entity.entityMetadata) {
        return <FormLoadingTwoColumn/>;
    }

    if (entity.loadingState.error) {
        return (
            <div className="p-4 text-red-500">
                Error: {entity.loadingState.error.message}
            </div>
        );
    }

    const formClassName = className || "p-2";

    return (
        <div className={formClassName}>
            {(entity.activeRecord || !entity.primaryKeyMetadata) && (
                <ArmaniForm {...formProps} />
            )}
        </div>
    );
}

// Memoize the entire component
export default React.memo(EntityContent, (prevProps, nextProps) => {
    return prevProps.entityKey === nextProps.entityKey &&
        prevProps.className === nextProps.className &&
        prevProps.density === nextProps.density &&
        prevProps.animationPreset === nextProps.animationPreset &&
        JSON.stringify(prevProps.formOptions) === JSON.stringify(nextProps.formOptions);
});
