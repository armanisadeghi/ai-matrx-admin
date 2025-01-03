"use client";

import React, { useCallback, useMemo } from "react";
import EntityRelationshipWrapperFinal from "@/app/entities/relationships/EntityRelationshipWrapperFinal";
import SmartCrudButtons from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons";
import { useFieldVisibility } from "@/lib/redux/entity/hooks/useFieldVisibility";
import MultiSelect from "@/components/ui/loaders/multi-select";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";

import { createEntitySelectors, useAppSelector } from "@/lib/redux";
import EntityBaseFieldFinal from "@/app/entities/fields/EntityBaseFieldFinal";
import { filterRelFields, getFormStyle } from "./formUtils";

const ArmaniFormFinal: React.FC<UnifiedLayoutProps> = (unifiedLayoutProps) => {
  const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
  const selectors = useMemo(
    () => createEntitySelectors(entityKey),
    [entityKey]
  );
  const activeRecordId = useAppSelector(selectors.selectActiveRecordId);
  const { nativeFields, relationshipFields } = useAppSelector(
    selectors.selectFieldGroups
  );
  
  // Get filtered relationship fields
  const { filteredRelFields, hiddenRelFields } = filterRelFields(
    relationshipFields,
    unifiedLayoutProps.entitiesToHide
  );
  
  const density = useMemo(
    () => unifiedLayoutProps.dynamicStyleOptions?.density || "normal",
    [unifiedLayoutProps.dynamicStyleOptions]
  );

  // Get field visibility state and controls
  const { 
    visibleFieldsInfo, 
    allowedFieldsInfo, 
    selectedFields, 
    toggleField,
    selectAllFields,
    clearAllFields 
  } = useFieldVisibility(entityKey, unifiedLayoutProps);

  // Create options for MultiSelect
  const selectOptions = useMemo(() => 
    allowedFieldsInfo.map((field) => ({
      value: field.name,
      label: field.displayName || field.name,
    })),
    [allowedFieldsInfo]
  );

  // Get current selected values
  const selectedValues = useMemo(() => 
    Array.from(selectedFields),
    [selectedFields]
  );

  // Filter visible native fields
  const visibleNativeFields = useMemo(() => 
    nativeFields.filter(field => selectedFields.has(field.name)),
    [nativeFields, selectedFields]
  );

  // Filter visible relationship fields
  const visibleRelFields = useMemo(() => {
    const { filteredRelFields: visibleRels } = filterRelFields(
      relationshipFields.filter(field => selectedFields.has(field.name)),
      unifiedLayoutProps.entitiesToHide
    );
    return visibleRels;
  }, [relationshipFields, selectedFields, unifiedLayoutProps.entitiesToHide]);

  // Handle field selection changes
  const handleFieldSelection = useCallback((values: string[]) => {
    // Handle additions
    values.forEach((fieldName) => {
      if (!selectedFields.has(fieldName)) {
        toggleField(fieldName);
      }
    });
    
    // Handle removals
    Array.from(selectedFields).forEach((fieldName) => {
      if (!values.includes(fieldName)) {
        toggleField(fieldName);
      }
    });
  }, [selectedFields, toggleField]);

  // Render field components
  const renderNativeField = useCallback(
    (field) => (
      <EntityBaseFieldFinal
        key={field.uniqueFieldId || field.name}
        fieldName={field.name}
        recordId={activeRecordId}
        entityKey={entityKey}
        unifiedLayoutProps={unifiedLayoutProps}
      />
    ),
    [entityKey, activeRecordId, unifiedLayoutProps]
  );

  const renderRelationshipField = useCallback(
    (field) => (
      <EntityRelationshipWrapperFinal
        key={field.uniqueFieldId || field.name}
        fieldName={field.name}
        recordId={activeRecordId}
        entityKey={entityKey}
        unifiedLayoutProps={unifiedLayoutProps}
      />
    ),
    [entityKey, activeRecordId, unifiedLayoutProps]
  );

  return (
    <div className={getFormStyle("form", density)}>
      <div className={getFormStyle("header", density)}>
        <div className="flex gap-2 items-center">
          <MultiSelect
            options={selectOptions}
            value={selectedValues}
            onChange={handleFieldSelection}
            placeholder="Select fields"
            showSelectedInDropdown={true}
          />
          <button 
            onClick={selectAllFields}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Select All
          </button>
          <button
            onClick={clearAllFields}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear
          </button>
        </div>
        <SmartCrudButtons
          entityKey={entityKey}
          options={{
            allowCreate: true,
            allowEdit: true,
            allowDelete: true,
          }}
          layout={{
            buttonLayout: "row",
            buttonSize: "icon",
          }}
        />
      </div>

      <div className={getFormStyle("fieldsWrapper", density)}>
        {visibleNativeFields.length > 0 && (
          <div className={getFormStyle("nativeFields", density)}>
            {visibleNativeFields.map(renderNativeField)}
          </div>
        )}

        {visibleRelFields.length > 0 && (
          <div className={getFormStyle("relationshipFields", density)}>
            {visibleRelFields.map(renderRelationshipField)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArmaniFormFinal;