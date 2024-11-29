import React from "react";
import {EntityKeys} from "@/types/entityTypes";
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import {UseFormReturn} from "react-hook-form";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import EntityBaseField from "@/components/matrx/ArmaniForm/EntityBaseField";
import {InlineFormField} from "./InlineFormField";
import EntityRelationshipWrapper from "@/components/matrx/ArmaniForm/EntityRelationshipWrapper";


export interface EntityBaseFieldProps {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful' |  'feedback' | 'error';
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    variant?: MatrxVariant;
    labelPosition?: 'default' | 'left' | 'right' | 'top' | 'bottom';
    disabled?: boolean;
    floatingLabel?: boolean;
    className?: string;
}


export interface BaseFieldProps extends EntityBaseFieldProps {
    isReadOnly?: boolean;
    formField: {
        onChange: (value: any) => void;
        onBlur: () => void;
        value: any;
        name: string;
        ref: React.Ref<any>;
        form?: UseFormReturn<Record<string, any>>;
    };
    parentForm?: UseFormReturn<Record<string, any>>;}

interface FieldFactoryProps extends BaseFieldProps {
    parentForm?: UseFormReturn<Record<string, any>>;
    isReadOnly?: boolean;
}

// const isInlineComponent = (componentType: string): boolean => {
//     return componentType === 'ACCORDION_VIEW';
// };

export const FieldFactory: React.FC<FieldFactoryProps> = (
    {
        dynamicFieldInfo,
        formField,
        value,
        entityKey,
        variant = 'default',
        labelPosition = 'default',
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        floatingLabel = true,
        disabled,
        isReadOnly,
        className,
        parentForm
    }) => {


    const renderField = (dynamicFieldInfo: EntityStateField) => {
        const commonProps: EntityBaseFieldProps = {
            entityKey,
            dynamicFieldInfo,
            value,
            onChange: formField.onChange,
            variant,
            labelPosition,
            disabled: disabled || isReadOnly,
            className,
            density,
            animationPreset,
            size,
            floatingLabel,
        };

        if (dynamicFieldInfo.isNative) {
            return <EntityBaseField {...commonProps} />;
        } else {
            return (
                <EntityRelationshipWrapper
                    {...commonProps}
                    formData={parentForm}
                />
            );
        }
    };

    // Use EntityBaseField for all other field types
    return (
        <EntityBaseField
            entityKey={entityKey}
            dynamicFieldInfo={dynamicFieldInfo}
            value={value}
            onChange={formField.onChange}
            variant={variant}
            labelPosition={labelPosition}
            disabled={disabled || isReadOnly}
            className={className}
            density="normal"
            animationPreset="subtle"
            size="default"
            floatingLabel={true}
        />
    );
};

export default FieldFactory;
