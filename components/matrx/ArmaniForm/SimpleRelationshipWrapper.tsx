'use client';

import React, {useRef} from 'react';
import {
    ENTITY_FK_COMPONENTS,
    ENTITY_IFK_COMPONENTS,
    ENTITY_M2M_COMPONENTS,
    ENTITY_SMART_COMPONENTS
} from './field-components';
import {EntityStateField, MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import EntityBaseField, {EntityBaseFieldProps} from "./EntityBaseField";
import {EntityKeys} from "@/types/entityTypes";
import {FormState} from "@/components/matrx/ArmaniForm/SimpleForm";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppSelector} from "@/lib/redux/hooks";
import {selectEntityPrettyName} from "@/lib/redux/schema/globalCacheSelectors";
import {DynamicLayoutOptions, DynamicStyleOptions} from "@/components/matrx/Entity";

export interface EntityRelationshipWrapperProps extends EntityBaseFieldProps {
    formData: Record<string, any>;
}

interface SimpleFormProps {
    primaryEntityKey: EntityKeys;
    foreignEntityKeys: EntityKeys[] | null;
    inverseEntityKeys: EntityKeys[] | null;
    manyToManyEntityKeys: EntityKeys[] | null;
    primaryActiveRecordId: MatrxRecordId | null;
    foreignActiveRecordIds: Record<EntityKeys, MatrxRecordId> | null;
    formMode: 'display' | 'create' | 'edit' | 'view';
    onSubmitUpdate?: (data: FormState) => void;
    onSubmitCreate?: (data: FormState) => void;
    onSubmitDelete?: () => void;
    dynamicLayoutOptions: DynamicLayoutOptions;
    dynamicStyles: DynamicStyleOptions;
}

export interface SmartComponentProps {
    entityKey: EntityKeys;
    matrxRecordId: MatrxRecordId;
    fieldInfo: EntityStateField;
    primaryEntityKey: EntityKeys;
    primaryActiveRecordId: MatrxRecordId | null;
    foreignActiveRecordIds: Record<EntityKeys, MatrxRecordId> | null;
    formMode: 'display' | 'create' | 'edit' | 'view';
    onSubmitUpdate?: (data: FormState) => void;
    onSubmitCreate?: (data: FormState) => void;
    onSubmitDelete?: () => void;
    dynamicLayoutOptions: DynamicLayoutOptions;
    dynamicStyles: DynamicStyleOptions;
}

const EntityFkWrapper = (
    {
        entityKey,
        matrxRecordId,
        primaryEntityKey,
        primaryActiveRecordId,
        foreignActiveRecordIds,
        formMode,
        onSubmitUpdate,
        onSubmitCreate,
        onSubmitDelete,
        dynamicLayoutOptions,
        dynamicStyles,
    }) => {
    const formRef = useRef<HTMLDivElement>(null);

    const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const fieldInfo = useAppSelector(selectors.selectFieldInfo);
    const entityPrettyName = useAppSelector((state) =>
        selectEntityPrettyName(state, entityKey)
    );

    const fieldType = (field: EntityStateField) => {
        if (!field || !field.defaultComponent) {
            throw new Error(`Invalid field or component: ${JSON.stringify(field)}`);
        }

        switch (field.structure) {
            case 'single':
                return ENTITY_SMART_COMPONENTS[field.defaultComponent];
            case 'foreignKey':
                return ENTITY_FK_COMPONENTS[field.defaultComponent];
            case 'inverseForeignKey':
                return ENTITY_IFK_COMPONENTS[field.defaultComponent];
            case 'manyToMany':
                return ENTITY_M2M_COMPONENTS[field.defaultComponent];
            default:
                throw new Error(`Unknown field structure: ${field.structure}`);
        }
    };

    const commonProps: Omit<SmartComponentProps, 'fieldInfo'> = {
        entityKey,
        matrxRecordId,
        foreignActiveRecordIds,
        primaryEntityKey,
        primaryActiveRecordId,
        formMode,
        onSubmitUpdate,
        onSubmitCreate,
        onSubmitDelete,
        dynamicLayoutOptions,
        dynamicStyles,
    };

    return (
        <div ref={formRef}
             className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-900">
            <div className="flex flex-col items-center text-center space-y-2">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Associated {entityPrettyName} Records
                </h2>
                {fieldInfo &&
                    Object.values(fieldInfo).map((field) => {
                        const Component = fieldType(field);
                        if (!Component) {
                            console.warn(`No component found for field: ${field.name}`);
                            return null;
                        }

                        return (
                            <Component
                                key={`fk-${field.uniqueFieldId}`}
                                fieldInfo={field}
                                {...commonProps}
                            />
                        );
                    })}
            </div>
        </div>
    );
};

export default EntityFkWrapper;
