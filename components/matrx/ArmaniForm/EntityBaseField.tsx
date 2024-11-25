'use client';

import React, {memo} from 'react';
import {ENTITY_FIELD_COMPONENTS} from './field-components';
import EntityLogger from "@/lib/redux/entity/entityLogger";
import {EntityKeys} from "@/types/entityTypes";
import {EntityStateField} from "@/lib/redux/entity/types";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";

export interface EntityBaseFieldProps {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    variant?: MatrxVariant;
    floatingLabel?: boolean;
}

const normalizeFieldValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined) {
        switch (fieldType.toLowerCase()) {
            case 'number':
                return 0;
            case 'boolean':
                return false;
            case 'array':
                return [];
            case 'object':
                return {};
            default:
                return '';
        }
    }
    return value;
};

const EntityBaseField = memo((
    {
        entityKey,
        dynamicFieldInfo,
        value,
        onChange,
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        variant = 'default',
        floatingLabel = true
    }: EntityBaseFieldProps) => {
    const Component = ENTITY_FIELD_COMPONENTS[dynamicFieldInfo.defaultComponent];

    const normalizedValue = normalizeFieldValue(
        value,
        dynamicFieldInfo.dataType || dynamicFieldInfo.componentProps?.type || 'text'
    );

    if (!Component) {
        console.error(`No component found for field type: ${dynamicFieldInfo.defaultComponent}`);
        return null;
    }

    return (
        <Component
            entityKey={entityKey}
            dynamicFieldInfo={dynamicFieldInfo}
            value={normalizedValue}
            onChange={onChange}
            density={density}
            animationPreset={animationPreset}
            size={size}
            variant={variant}
            floatingLabel={floatingLabel}
        />
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.value === nextProps.value &&
        prevProps.density === nextProps.density &&
        prevProps.animationPreset === nextProps.animationPreset &&
        prevProps.size === nextProps.size &&
        prevProps.variant === nextProps.variant &&
        prevProps.floatingLabel === nextProps.floatingLabel &&
        prevProps.entityKey === nextProps.entityKey &&
        prevProps.dynamicFieldInfo.uniqueFieldId === nextProps.dynamicFieldInfo.uniqueFieldId
    );
});

EntityBaseField.displayName = 'EntityBaseField';

export default EntityBaseField;
