'use client';

import React from "react";
import { EntitySearchInput } from "../field-components";
import { spacingConfig } from "@/config/ui/entity-layout-config";
import EntityBaseField, { EntityBaseFieldProps } from "../EntityBaseField";
import { EntityStateField } from "@/lib/redux/entity/types/stateTypes";
import EntityRelationshipWrapper from "../EntityRelationshipWrapper";
import SmartCrudButtons from "../../Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons";
import { UnifiedLayoutProps } from "../../Entity";
import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import { useFieldVisibility } from "@/lib/redux/entity/hooks/useFieldVisibility";
import {MultiSelect, Select} from '@/components/ui/loaders/select';

const ArmaniFormSmart: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const { activeRecordCrud, getEffectiveRecord } = useEntityCrud(entityKey);
    const {
        visibleFieldsInfo,
        allowedFieldsInfo,
        selectedFields,
        searchTerm,
        setSearchTerm,
        toggleField,
        selectAllFields,
        clearAllFields,
        isSearchEnabled
    } = useFieldVisibility(entityKey, unifiedLayoutProps);

    const currentRecordData = activeRecordCrud.recordId ?
                              getEffectiveRecord(activeRecordCrud.recordId) :
        {};

    const dynamicLayoutOptions = unifiedLayoutProps.dynamicLayoutOptions;
    const formStyleOptions = dynamicLayoutOptions.formStyleOptions || {};
    const floatingLabel = formStyleOptions.floatingLabel ?? true;

    const dynamicStyleOptions = unifiedLayoutProps.dynamicStyleOptions;
    const density = dynamicStyleOptions.density || 'normal';
    const animationPreset = dynamicStyleOptions.animationPreset || 'smooth';
    const variant = dynamicStyleOptions.variant || 'default';
    const size = dynamicStyleOptions.size || 'default';
    const unifiedCrudHandlers = unifiedLayoutProps.unifiedCrudHandlers;
    const onUpdateField = unifiedCrudHandlers?.handleFieldUpdate;
    const densityStyles = spacingConfig[density];

    const selectOptions = allowedFieldsInfo.map(field => ({
        value: field.name,
        label: field.displayName || field.name
    }));

    const selectedValues = Array.from(selectedFields);

    const handleFieldSelection = (values: string[]) => {
        values.forEach(fieldName => {
            if (!selectedFields.has(fieldName)) {
                toggleField(fieldName);
            }
        });
        selectedValues.forEach(fieldName => {
            if (!values.includes(fieldName)) {
                toggleField(fieldName);
            }
        });
    };

    const renderField = (dynamicFieldInfo: EntityStateField) => {
        const commonProps: EntityBaseFieldProps = {
            entityKey,
            dynamicFieldInfo,
            value: currentRecordData[dynamicFieldInfo.name] || '',
            onChange: (value: any) => onUpdateField(dynamicFieldInfo.name, value),
            density,
            animationPreset,
            size,
            variant,
            floatingLabel,
        };

        if (dynamicFieldInfo.isNative) {
            return <EntityBaseField {...commonProps} />;
        } else {
            return (
                <EntityRelationshipWrapper
                    {...commonProps}
                    currentRecordData={currentRecordData}
                />
            );
        }
    };

    return (
        <div className="w-full">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {isSearchEnabled && (
                    <div className="flex-1">
                        <EntitySearchInput
                            dynamicFieldInfo={allowedFieldsInfo}
                            onSearchChange={setSearchTerm}
                            density={density}
                            animationPreset={animationPreset}
                            size={size}
                            variant={variant}
                            className={densityStyles.inputSize}
                        />
                    </div>
                )}
                <div className="w-full sm:w-64">
                    <MultiSelect
                        options={selectOptions}
                        value={selectedValues}
                        onChange={handleFieldSelection}
                        placeholder="Select fields"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mt-2">
                {visibleFieldsInfo.map((fieldInfo, index) => (
                    <div key={`${fieldInfo.uniqueFieldId}-${index}`}>
                        {renderField(fieldInfo)}
                    </div>
                ))}
            </div>

            <SmartCrudButtons
                entityKey={entityKey}
                options={{
                    allowCreate: true,
                    allowEdit: true,
                    allowDelete: true
                }}
                layout={{
                    buttonLayout: 'row',
                    buttonSize: 'sm'
                }}
                className="mb-4"
            />
        </div>
    );
};

export default ArmaniFormSmart;
