'use client';

import React, {useCallback, useMemo} from "react";
import EntityRelationshipWrapperFinal from "./EntityRelationshipWrapperFinal";
import SmartCrudButtons
    from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons";
import {useFieldVisibility} from "@/lib/redux/entity/hooks/useFieldVisibility";
import MultiSelect from '@/components/ui/loaders/multi-select';
import {UnifiedLayoutProps} from "@/components/matrx/Entity";
import EntityBaseFieldFinal, {
} from "@/app/(authenticated)/tests/forms/entity-final-test/EntityBaseFieldFinal";
import {createEntitySelectors, useAppSelector} from "@/lib/redux";


export const filterRelFields = (relationshipFields, entitiesToHide) => {
    const fields = relationshipFields || [];
    const entitiesToHideList = entitiesToHide || [];

    console.log('======== relationshipFields: fields:', relationshipFields);
    console.log('======== entitiesToHide:', entitiesToHide);

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

    const { nativeFields, relationshipFields } = useAppSelector(selectors.selectFieldGroups);
    const activeRecordId = useAppSelector(selectors.selectActiveRecordId);

    const { filteredRelFields, hiddenRelFields } = filterRelFields(
        relationshipFields,
        unifiedLayoutProps.entitiesToHide
    );


    const {
        visibleFieldsInfo,
        allowedFieldsInfo,
        selectedFields,
        toggleField,
    } = useFieldVisibility(entityKey, unifiedLayoutProps);

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

    const renderNativeField = useCallback((field) => (
        <EntityBaseFieldFinal
            key={field.uniqueFieldId || field.name}
            fieldName={field.name}
            recordId={activeRecordId}
            entityKey={entityKey}
            unifiedLayoutProps={unifiedLayoutProps}
        />
    ), [entityKey, activeRecordId, unifiedLayoutProps]);

    const renderRelationshipField = useCallback((field) => (
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
                {nativeFields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                        {nativeFields.map(renderNativeField)}
                    </div>
                )}

                {filteredRelFields.length > 0 && (
                    <div className="space-y-2">
                        {filteredRelFields.map(renderRelationshipField)}
                    </div>
                )}

                <div className="space-y-2">
                    {hiddenRelFields.length > 0 ? (
                        hiddenRelFields.map(field => (
                            <div key={field.entityName}>
                                <p>Name: {field.name}</p>
                                <p>Entity Name: {field.entityName}</p>
                            </div>
                        ))
                    ) : (
                        <p>None Hidden</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ArmaniFormFinal;
