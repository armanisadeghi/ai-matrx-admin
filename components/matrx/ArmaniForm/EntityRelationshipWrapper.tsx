'use client';

import React from 'react';
import {ENTITY_FIELD_COMPONENTS} from './field-components';
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import {EntityBaseFieldProps} from "./EntityBaseField";

export interface EntityRelationshipWrapperProps extends EntityBaseFieldProps {
    formData: Record<string, any>;
}

const EntityRelationshipWrapper = (
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
        formData,
    }: EntityRelationshipWrapperProps) => {
    const Component = ENTITY_FIELD_COMPONENTS[dynamicFieldInfo.defaultComponent];
    const valueOrDefault = value ?? dynamicFieldInfo.defaultValue;

    const entityKeyToUse = (dynamicFieldInfo: EntityStateField) => {
        if (!dynamicFieldInfo.isNative) {
            return dynamicFieldInfo.entityName;
        } else {
            throw new Error('EntityRelationshipWrapper: field is not an entity relationship');
        }
    }

        return (
        <Component
            entityKey={entityKeyToUse(dynamicFieldInfo)}
            dynamicFieldInfo={dynamicFieldInfo}
            value={valueOrDefault}
            onChange={onChange}
            density={density}
            animationPreset={animationPreset}
            size={size}
            variant={variant}
            floatingLabel={floatingLabel}
            formData={formData}
            activeEntityKey={entityKey}
        />
    );
};

EntityRelationshipWrapper.displayName = 'EntityRelationshipWrapper';

export default EntityRelationshipWrapper;
