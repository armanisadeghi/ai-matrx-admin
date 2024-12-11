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
import MultiSelect from '@/components/ui/loaders/multi-select';

const ArmaniFormSmart: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const { activeRecordCrud, getEffectiveRecordOrDefaults } = useEntityCrud(entityKey);
    const {
        visibleFieldsInfo,
        allowedFieldsInfo,
        selectedFields,
        setSearchTerm,
        toggleField,
        isSearchEnabled
    } = useFieldVisibility(entityKey, unifiedLayoutProps);

    const currentRecordData = activeRecordCrud.recordId ?
                              getEffectiveRecordOrDefaults(activeRecordCrud.recordId) :
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

    // Separate base fields and relationship fields
    const { baseFields, relationshipFields } = visibleFieldsInfo.reduce((acc, field) => {
        if (field.isNative) {
            acc.baseFields.push(field);
        } else {
            acc.relationshipFields.push(field);
        }
        return acc;
    }, { baseFields: [] as EntityStateField[], relationshipFields: [] as EntityStateField[] });

    return (
        <div className="w-full">
            <div className="inline-flex items-center flex-wrap gap-4 p-2">
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
                />
                <MultiSelect
                    options={selectOptions}
                    value={selectedValues}
                    onChange={handleFieldSelection}
                    placeholder="Select fields"
                    showSelectedInDropdown={true}
                />
                {isSearchEnabled && (
                    <div className="flex-grow">
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
            </div>

            <div className="space-y-4 mt-4">
                {baseFields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                        {baseFields.map((fieldInfo, index) => (
                            <div key={`${fieldInfo.uniqueFieldId}-${index}`}>
                                {renderField(fieldInfo)}
                            </div>
                        ))}
                    </div>
                )}

                {relationshipFields.length > 0 && (
                    <div className="space-y-2">
                        {relationshipFields.map((fieldInfo, index) => (
                            <div key={`${fieldInfo.uniqueFieldId}-${index}`} className="w-full">
                                {renderField(fieldInfo)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ArmaniFormSmart;
