'use client';

import React, {useCallback, useMemo} from "react";
import EntityRelationshipWrapperFinal from "@/app/entities/relationships/EntityRelationshipWrapperFinal";
import SmartCrudButtons
    from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons";
import {useFieldVisibility} from "@/app/entities/hooks/form-related/useFieldVisibility";
import MultiSelect from '@/components/ui/loaders/multi-select';
import {UnifiedLayoutProps} from "@/components/matrx/Entity";
import {createEntitySelectors, useAppSelector} from "@/lib/redux";
import EntityBaseFieldFinal from "@/app/entities/fields/EntityBaseFieldFinal";
import { EntityStateField } from "@/lib/redux/entity/types/stateTypes";


export const filterRelFields = (relationshipFields, entitiesToHide) => {
    const fields = relationshipFields || [];
    const entitiesToHideList = entitiesToHide || [];
    return {
        filteredRelFields: fields.filter(field =>
            !entitiesToHideList.includes(field.entityName)
        ),
        hiddenRelFields: fields.filter(field =>
            entitiesToHideList.includes(field.entityName)
        )
    };
};


const ArmaniFormFinal: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);

    const {
        visibleFields,
        visibleNativeFields,
        visibleRelationshipFields,
        allowedFields,
        toggleField,
        selectOptions,
    } = useFieldVisibility(entityKey, unifiedLayoutProps);

    // Convert field names to EntityStateField objects
    const visibleFieldsAsObjects = useAppSelector(state => {
        if (!selectors || !visibleFields.length) return [];
        
        return visibleFields.map(fieldName => 
            selectors.selectFieldMetadata(state, fieldName as string)
        ).filter(Boolean) as EntityStateField[];
    });

    const visibleNativeFieldsAsObjects = useAppSelector(state => {
        if (!selectors || !visibleNativeFields.length) return [];
        
        return visibleNativeFields.map(fieldName => 
            selectors.selectFieldMetadata(state, fieldName as string)
        ).filter(Boolean) as EntityStateField[];
    });

    const visibleRelationshipFieldsAsObjects = useAppSelector(state => {
        if (!selectors || !visibleRelationshipFields.length) return [];
        
        return visibleRelationshipFields.map(fieldName => 
            selectors.selectFieldMetadata(state, fieldName as string)
        ).filter(Boolean) as EntityStateField[];
    });

    const {filteredRelFields, hiddenRelFields} = filterRelFields(visibleRelationshipFieldsAsObjects, unifiedLayoutProps.entitiesToHide);

    const selectedValues = visibleFields;

    const handleFieldSelection = (values: string[]) => {
        // Toggle fields that should be added (in values but not in current visible fields)
        values.forEach(fieldName => {
            if (!visibleFields.includes(fieldName as any)) {
                toggleField(fieldName as any);
            }
        });
        
        // Toggle fields that should be removed (in current visible fields but not in values)
        visibleFields.forEach(fieldName => {
            if (!values.includes(fieldName as string)) {
                toggleField(fieldName);
            }
        });
    };

    const renderNativeField = useCallback((field: EntityStateField) => (
        <EntityBaseFieldFinal
            key={field.uniqueFieldId || field.name}
            fieldName={field.name}
            recordId={activeRecordId}
            entityKey={entityKey}
            unifiedLayoutProps={unifiedLayoutProps}
        />
    ), [entityKey, activeRecordId, unifiedLayoutProps]);

    const renderRelationshipField = useCallback((field: EntityStateField) => (
        <EntityRelationshipWrapperFinal
            key={field.uniqueFieldId || field.name}
            fieldName={field.name}
            recordId={activeRecordId}
            entityKey={entityKey}
            unifiedLayoutProps={unifiedLayoutProps}
        />
    ), [entityKey, activeRecordId, unifiedLayoutProps]);


    return (
        <div className="w-full">
            <div className="p-2 flex items-center justify-end gap-2">
                <MultiSelect
                    options={selectOptions}
                    value={selectedValues}
                    onChange={handleFieldSelection}
                    placeholder="Select fields"
                    showSelectedInDropdown={true}
                />
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
            </div>

            <div className="space-y-4 mt-4 p-2">
                {visibleNativeFieldsAsObjects.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                        {visibleNativeFieldsAsObjects.map(renderNativeField)}
                    </div>
                )}

                {filteredRelFields.length > 0 && (
                    <div className="space-y-2">
                        {filteredRelFields.map(renderRelationshipField)}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ArmaniFormFinal;
