'use client';

import React, {useRef} from "react";
import EntityBaseField from "./EntityBaseField";
import { MatrxRecordId} from "@/lib/redux/entity/types/stateTypes";
import {
    AnimationPreset,
     ComponentDensity, ComponentSize,
    FormColumnsOptions,
    FormDirectionOptions,
    FormLayoutOptions,
    InlineEntityColumnsOptions,
    InlineEntityComponentStyles,
    PageLayoutOptions,
    QuickReferenceComponentType,
    TextSizeOptions
} from "@/types/componentConfigTypes";
import {EntityKeys} from "@/types/entityTypes";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import EntityFkWrapper from "./SimpleRelationshipWrapper";
import {DynamicLayoutOptions, DynamicStyleOptions} from "@/components/matrx/Entity/prewired-components/layouts/types";

export interface FormState {
    [key: string]: any;
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
    dynamicStyleOptions: DynamicStyleOptions;
}


const ArmaniForm: React.FC<SimpleFormProps> = (
    {
        primaryEntityKey,
        foreignEntityKeys = null,
        inverseEntityKeys = null,
        manyToManyEntityKeys = null,
        primaryActiveRecordId = null,
        foreignActiveRecordIds = null,
        formMode = 'display',
        onSubmitUpdate,
        onSubmitCreate,
        onSubmitDelete,
        dynamicLayoutOptions,
        dynamicStyleOptions,
    }) => {
    const formRef = useRef<HTMLDivElement>(null);

    const commonProps = {
        primaryEntityKey,
        primaryActiveRecordId,
        foreignActiveRecordIds,
        formMode,
        onSubmitUpdate,
        onSubmitCreate,
        onSubmitDelete,
        dynamicLayoutOptions,
        dynamicStyleOptions,
    };

    return (
        <div ref={formRef}>
            <EntityBaseField {...commonProps} />

            {/* Render a wrapper for each foreignActiveRecordId corresponding to foreignEntityKeys */}
            {foreignEntityKeys &&
                foreignEntityKeys.map((key) =>
                    foreignActiveRecordIds && foreignActiveRecordIds[key] ? (
                        <EntityFkWrapper
                            {...commonProps}
                            entityKey={key}
                            matrxRecordId={foreignActiveRecordIds[key]}
                            key={`fk-${key}-${foreignActiveRecordIds[key]}`}
                        />
                    ) : null
                )}

            {/* Render a wrapper for each inverseEntityKey */}
            {inverseEntityKeys &&
                inverseEntityKeys.map((key) => (
                    <EntityIfkWrapper {...commonProps} entityKey={key} key={`ifk-${key}`} />
                ))}

            {/* Render a wrapper for each manyToManyEntityKey */}
            {manyToManyEntityKeys &&
                manyToManyEntityKeys.map((key) => (
                    <EntityM2MWrapper {...commonProps} entityKey={key} key={`m2m-${key}`} />
                ))}
        </div>
    );
};

export default ArmaniForm;
