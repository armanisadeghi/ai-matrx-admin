'use client';

import React from 'react';
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import { EntityBaseFieldProps } from './EntityBaseFieldFinal';
import { ENTITY_FIELD_COMPONENTS } from '@/components/matrx/ArmaniForm/field-components';

export interface EntityRelationshipWrapperProps extends EntityBaseFieldProps {
    currentRecordData: Record<string, any>;
}

const EntityRelationshipWrapperFinal = (
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
        currentRecordData,
    }: EntityRelationshipWrapperProps) => {
    const Component = ENTITY_FIELD_COMPONENTS[dynamicFieldInfo.defaultComponent];
    const valueOrDefault = value ?? dynamicFieldInfo.defaultValue;

    const entityKeyToUse = (dynamicFieldInfo: EntityStateField) => {
        if (!dynamicFieldInfo.isNative) {
            console.log('EntityRelationshipWrapperFinal: returning entityName:', dynamicFieldInfo.entityName);
            return dynamicFieldInfo.entityName;
        } else {
            throw new Error('EntityRelationshipWrapperFinal: field is not an entity relationship');
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
            formData={currentRecordData}
            activeEntityKey={entityKey}
        />
    );
};

EntityRelationshipWrapperFinal.displayName = 'EntityRelationshipWrapperFinal';

export default EntityRelationshipWrapperFinal;
