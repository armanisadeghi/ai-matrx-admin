'use client';

import React, { useCallback, useMemo } from "react";
import EntityRelationshipWrapperFinal from "@/app/entities/relationships/EntityRelationshipWrapperFinal";
import { useFieldVisibility } from "@/lib/redux/entity/hooks/useFieldVisibility";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { createEntitySelectors, useAppSelector } from "@/lib/redux";
import EntityBaseFieldFinal from "@/app/entities/fields/EntityBaseFieldFinal";

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

interface EntityFormMinimalAnyRecordProps extends UnifiedLayoutProps {
    recordId: string;
}

const EntityFormMinimalAnyRecord: React.FC<EntityFormMinimalAnyRecordProps> = ({ recordId, ...unifiedLayoutProps }) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const { nativeFields, relationshipFields } = useAppSelector(selectors.selectFieldGroups);
    const { filteredRelFields, hiddenRelFields } = filterRelFields(relationshipFields, unifiedLayoutProps.entitiesToHide);

    const {
        visibleFieldsInfo,
        allowedFieldsInfo,
        selectedFields,
        toggleField,
    } = useFieldVisibility(entityKey, unifiedLayoutProps);

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
        <div className="w-full">
            <EntityBaseFieldFinal
                key={field.uniqueFieldId || field.name}
                fieldName={field.name}
                recordId={recordId}
                entityKey={entityKey}
                unifiedLayoutProps={unifiedLayoutProps}
            />
        </div>
    ), [entityKey, recordId, unifiedLayoutProps]);

    const renderRelationshipField = useCallback((field) => (
        <div className="w-full">
            <EntityRelationshipWrapperFinal
                key={field.uniqueFieldId || field.name}
                fieldName={field.name}
                recordId={recordId}
                entityKey={entityKey}
                unifiedLayoutProps={unifiedLayoutProps}
            />
        </div>
    ), [entityKey, recordId, unifiedLayoutProps]);

    return (
        <div className="w-full overflow-y-auto">
            <div className="space-y-0">
                {nativeFields.length > 0 && (
                    <div className="flex flex-col w-full">
                        {nativeFields.map(renderNativeField)}
                    </div>
                )}

                {filteredRelFields.length > 0 && (
                    <div className="flex flex-col w-full">
                        {filteredRelFields.map(renderRelationshipField)}
                    </div>
                )}
            </div>
        </div>
    );
};

const EntityFormRecordSelections: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
    const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
    const selectors = useMemo(() => createEntitySelectors(entityKey), [entityKey]);
    const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);

    if (!selectedRecordIds?.length) {
        return null;
    }

    return (
        <div className="w-full space-y-4">
            {selectedRecordIds.map(recordId => (
                <EntityFormMinimalAnyRecord
                    key={recordId}
                    recordId={recordId}
                    {...unifiedLayoutProps}
                />
            ))}
        </div>
    );
};

export { EntityFormMinimalAnyRecord, EntityFormRecordSelections };