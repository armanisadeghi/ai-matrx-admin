'use client';

import React from 'react';
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
import {mapFieldDataTypeToFormFieldType} from "@/components/matrx/Entity/addOns/mapDataTypeToFormFieldType";
import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    FormColumnOptions, FormDirectionOptions,
    FormLayoutOptions
} from '@/types/componentConfigTypes';
import ArmaniForm from "@/components/matrx/AnimatedForm/ArmaniForm";


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

function EntityContent<TEntity extends EntityKeys>({
    entityKey,
    className,
    density,
    animationPreset,
    formOptions
}: EntityContentProps<TEntity>) {
    const entity = useEntity(entityKey);

    const transformFieldsToFormFields = (entityFields: EntityStateField[]): EntityFlexFormField[] => {
        if (!entityFields) return [];

        return entityFields.map(field => ({
            ...field,
            name: field.name,
            label: field.displayName || field.name,
            type: mapFieldDataTypeToFormFieldType(field.dataType) as FormFieldType,
            required: field.isRequired,
            disabled: false,
            defaultValue: field.defaultValue,
            validation: field.validationFunctions,
            maxLength: field.maxLength,
        }));
    };

    const formProps: FlexEntityFormProps = React.useMemo(() => {
        if (!entity?.activeRecord) {
            return {
                fields: [],
                formState: {},
                onUpdateField: () => {
                },
                onSubmit: () => {
                },
            };
        }

        const formFields = transformFieldsToFormFields(entity.fieldInfo);

        return {
            fields: formFields,
            formState: entity.activeRecord as EntityFormState,
            onUpdateField: (name: string, value: any) => {
                if (!entity.activeRecord || !entity.primaryKeyMetadata) return;

                const primaryKeyValues = entity.primaryKeyMetadata.fields.reduce((acc, field) => ({
                    ...acc,
                    [field]: entity.activeRecord[field]
                }), {} as Record<string, MatrxRecordId>);

                const update = {
                    [name]: value
                } as Partial<EntityData<TEntity>>;

                entity.updateRecord(primaryKeyValues, update);
            },
            onSubmit: () => {
                if (!entity.activeRecord || !entity.primaryKeyMetadata) return;
                console.log('Form submitted:', entity.activeRecord);
            },
            // Apply form options with defaults
            layout: formOptions?.formLayout ?? 'grid',
            direction: formOptions?.formDirection ?? 'row',
            enableSearch: formOptions?.formEnableSearch ?? false,
            columns: formOptions?.formColumns ?? 2,
            isSinglePage: formOptions?.formIsSinglePage ?? true,
            isFullPage: formOptions?.formIsFullPage ?? true,
            ...(formOptions?.size && { size: formOptions.size })
        };
    }, [entity.fieldInfo, entity.primaryKeyMetadata, entity, formOptions]);

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

    const formClassName = className || "p-4";

    return (
        <div className={formClassName}>
            {entity.activeRecord && (
                <ArmaniForm
                    {...formProps}
                    // Pass animation preset if the form component supports it
                    {...(animationPreset && { animationPreset })}
                    // Pass density if the form component supports it
                    {...(density && { density })}
                />
            )}
        </div>
    );
}

export default EntityContent;
