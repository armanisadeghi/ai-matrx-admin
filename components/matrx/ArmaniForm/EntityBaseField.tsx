'use client';

import React from 'react';
import {ENTITY_FIELD_COMPONENTS} from './field-components';
import FormFieldMotionWrapper from "@/components/matrx/ArmaniForm/field-components/wrappers/FormFieldMotionWrapper";
import {EntityKeys} from "@/types/entityTypes";
import {EntityStateField} from "@/lib/redux/entity/types";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";

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

const EntityBaseField = (
    {
        entityKey,
        dynamicFieldInfo,
        value,
        onChange,
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        variant = 'default',
        floatingLabel = true,
        disabled = false,
        className,
    }: EntityBaseFieldProps) => {
    const Component = ENTITY_FIELD_COMPONENTS[dynamicFieldInfo.defaultComponent];
    const valueOrDefault = value ?? dynamicFieldInfo.defaultValue;
    const customProps = dynamicFieldInfo.componentProps as Record<string, unknown>;
    const isDisabled = disabled === true || customProps?.disabled === true;

    return (
        <FormFieldMotionWrapper
            animationPreset={animationPreset}
            density={density}
            floatingLabel={floatingLabel}
            className={className}
        >
            <Component
                entityKey={entityKey}
                dynamicFieldInfo={dynamicFieldInfo}
                value={valueOrDefault}
                onChange={onChange}
                density={density}
                animationPreset={animationPreset}
                size={size}
                variant={variant}
                floatingLabel={floatingLabel}
                disabled={isDisabled}
            />
        </FormFieldMotionWrapper>

    );
};

EntityBaseField.displayName = 'EntityBaseField';

export default EntityBaseField;
