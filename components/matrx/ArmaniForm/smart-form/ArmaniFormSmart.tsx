'use client';

import React from "react";
import { EntitySearchInput } from "../field-components";
import { spacingConfig } from "@/config/ui/entity-layout-config";
import SmartCrudButtons from "../../Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons";
import { UnifiedLayoutProps } from "../../Entity";
import { useEntityCrud } from "@/lib/redux/entity/hooks/useEntityCrud";
import { useFieldVisibility } from "@/app/entities/hooks/form-related/useFieldVisibility";
import { useFieldRenderer } from "@/app/entities/hooks/form-related/useFieldRenderer";
import { useFieldConfiguration } from "@/app/entities/hooks/form-related/useFieldConfiguration";
import { MatrxRecordId } from "@/types/entityTypes";
import MultiSelect from '@/components/ui/loaders/multi-select';

interface ArmaniFormSmartProps extends UnifiedLayoutProps {
    recordId?: MatrxRecordId;
}

const ArmaniFormSmart: React.FC<ArmaniFormSmartProps> = (props) => {
    const { recordId: propRecordId, ...unifiedLayoutProps } = props;
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const { activeRecordCrud, getEffectiveRecordOrDefaults } = useEntityCrud(entityKey);
    
    // Use provided recordId or fall back to active record
    const effectiveRecordId = propRecordId || activeRecordCrud.recordId;
    
    const {
        visibleFields,
        visibleNativeFields,
        visibleRelationshipFields,
        searchTerm,
        setSearchTerm,
        toggleField,
        selectOptions,
        isSearchEnabled
    } = useFieldVisibility(entityKey, unifiedLayoutProps);

    // Get field configuration for search placeholders
    const { allowedFields, fieldDisplayNames } = useFieldConfiguration(entityKey, unifiedLayoutProps);

    const { getNativeFieldComponent, getRelationshipFieldComponent } = useFieldRenderer(
        entityKey, 
        effectiveRecordId, 
        unifiedLayoutProps
    );

    const currentRecordData = effectiveRecordId ?
                              getEffectiveRecordOrDefaults(effectiveRecordId) :
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

    const selectedValues = Array.from(visibleFields);

    const handleFieldSelection = (values: string[]) => {
        // Clear all fields first, then toggle selected ones
        values.forEach(fieldName => {
            if (!visibleFields.includes(fieldName as any)) {
                toggleField(fieldName as any);
            }
        });
        selectedValues.forEach(fieldName => {
            if (!values.includes(fieldName)) {
                toggleField(fieldName as any);
            }
        });
    };

    // Get pre-rendered field components
    const baseFieldComponents = visibleNativeFields.map(getNativeFieldComponent);
    const relationshipFieldComponents = visibleRelationshipFields.map(getRelationshipFieldComponent);

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
                            entityKey={entityKey}
                            fieldDisplayNames={fieldDisplayNames}
                            allowedFields={allowedFields}
                            searchTerm={searchTerm}
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
                {baseFieldComponents.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                        {baseFieldComponents.map((fieldComponent, index) => (
                            <div key={`base-field-${index}`}>
                                {fieldComponent}
                            </div>
                        ))}
                    </div>
                )}

                {relationshipFieldComponents.length > 0 && (
                    <div className="space-y-2">
                        {relationshipFieldComponents.map((fieldComponent, index) => (
                            <div key={`relationship-field-${index}`} className="w-full">
                                {fieldComponent}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ArmaniFormSmart;
