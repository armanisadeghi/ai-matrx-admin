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

function EntityContent<TEntity extends EntityKeys>(
    {
        entityKey,
        className,
        density,
        animationPreset,
        formOptions
    }: EntityContentProps<TEntity>) {
    const entity = useEntity(entityKey);

    // Updated transformFieldsToFormFields with new fields and logic
    const transformFieldsToFormFields = (entityFields: EntityStateField[]): EntityFlexFormField[] => {
        if (!entityFields) return [];

        // Helper function to handle additional transformation logic
        const applyFieldLogic = (field: EntityFlexFormField, originalField: EntityStateField): EntityFlexFormField => {
            if (originalField.defaultComponent === 'inline-form:1') {
                field.actionKeys = ['entityQuickSidebar'];
            }
            return field;
        };

        return entityFields.map(field => {
            // Map the base transformation
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
                actionKeys: [],
                actionProps: {},
                defaultComponent: field.defaultComponent, // New field
                componentProps: field.componentProps,   // New field
            };

            // Apply additional field logic
            return applyFieldLogic(transformedField, field);
        });
    };

    const formProps: FlexEntityFormProps = React.useMemo(() => {
        if (!entity?.activeRecord) {
            return {
                fields: [],
                formState: {},
                onUpdateField: () => {}, // No-op for field changes
                onSubmit: () => {}, // No-op for submit
            };
        }

        const formFields = transformFieldsToFormFields(entity.fieldInfo);

        let localFormState = { ...entity.activeRecord }; // Maintain local state

        return {
            fields: formFields,
            formState: entity.activeRecord as EntityFormState,
            onUpdateField: (name: string, value: any) => {
            // Update local form state, no DB interaction
            localFormState = {
                ...localFormState,
                [name]: value,
            };
            },
            onSubmit: () => {
                if (!entity.activeRecord || !entity.primaryKeyMetadata) return;
            const primaryKeyValues = entity.primaryKeyMetadata.fields.reduce(
                (acc, field) => ({
                    ...acc,
                    [field]: entity.activeRecord[field],
                }),
                {} as Record<string, MatrxRecordId>
            );

            entity.updateRecord(primaryKeyValues, localFormState); // Save changes to DB here
            console.log("Form submitted:", localFormState);
            },
            layout: formOptions?.formLayout ?? 'grid',
            direction: formOptions?.formDirection ?? 'row',
            enableSearch: formOptions?.formEnableSearch ?? false,
            columns: formOptions?.formColumns ?? 2,
            isSinglePage: formOptions?.formIsSinglePage ?? true,
            isFullPage: formOptions?.formIsFullPage ?? true,
            ...(formOptions?.size && {size: formOptions.size}),
            ...(animationPreset && {animationPreset}), // Move animationPreset here
        ...(density && { density }), // Move density here
        };
    }, [entity, formOptions, animationPreset, density]); // Add dependencies

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
            {entity.activeRecord && (
                <ArmaniForm {...formProps} />
            )}
        </div>
    );
}

export default EntityContent;
