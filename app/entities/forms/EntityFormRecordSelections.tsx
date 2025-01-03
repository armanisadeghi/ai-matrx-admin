"use client";

import React, { useCallback, useMemo } from "react";
import { useFieldVisibility } from "@/lib/redux/entity/hooks/useFieldVisibility";
import { UnifiedLayoutProps } from "@/components/matrx/Entity";
import { createEntitySelectors, useAppSelector } from "@/lib/redux";
import EntityBaseFieldFinal from "@/app/entities/fields/EntityBaseFieldFinal";
import { getFormStyle } from "./formUtils";
import MultiSelect from "@/components/ui/loaders/multi-select";


interface EntityFormMinimalAnyRecordProps extends UnifiedLayoutProps {
  recordId: string;
}

const EntityFormMinimalAnyRecord: React.FC<EntityFormMinimalAnyRecordProps> = ({
  recordId,
  ...unifiedLayoutProps
}) => {
  const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
  const selectors = useMemo(
    () => createEntitySelectors(entityKey),
    [entityKey]
  );
  const { nativeFields } = useAppSelector(
    selectors.selectFieldGroups
  );
  const density = useMemo(
    () => unifiedLayoutProps.dynamicStyleOptions?.density || "normal",
    [unifiedLayoutProps.dynamicStyleOptions]
  );

  const { 
    visibleFields, 
    visibleFieldsInfo, 
    allowedFieldsInfo, 
    selectedFields, 
    toggleField 
  } = useFieldVisibility(entityKey, unifiedLayoutProps);

  const selectOptions = useMemo(() => 
    allowedFieldsInfo.map((field) => ({
      value: field.name,
      label: field.displayName || field.name,
    })),
    [allowedFieldsInfo]
  );

  const selectedValues = useMemo(() => 
    Array.from(selectedFields),
    [selectedFields]
  );

  const handleFieldSelection = useCallback((values: string[]) => {
    const currentSelected = Array.from(selectedFields);
    
    values.forEach((fieldName) => {
      if (!selectedFields.has(fieldName)) {
        toggleField(fieldName);
      }
    });
    
    currentSelected
      .filter(fieldName => !values.includes(fieldName))
      .forEach(toggleField);
  }, [selectedFields, toggleField]);

  // Filter native fields based on visibility
  const visibleNativeFields = useMemo(() => 
    nativeFields.filter(field => 
      visibleFields.includes(field.name)
    ),
    [nativeFields, visibleFields]
  );

  const renderField = useCallback((field) => {
    const fieldKey = `${recordId}-${field.uniqueFieldId || field.name}`;
    return (
      <div key={fieldKey} className="w-full">
        <EntityBaseFieldFinal
          fieldName={field.name}
          recordId={recordId}
          entityKey={entityKey}
          unifiedLayoutProps={unifiedLayoutProps}
        />
      </div>
    );
  }, [entityKey, recordId, unifiedLayoutProps]);

  return (
    <div className={getFormStyle("form", density)}>
      <div className={getFormStyle("header", density)}>
        <MultiSelect
          options={selectOptions}
          value={selectedValues}
          onChange={handleFieldSelection}
          placeholder="Select fields"
          showSelectedInDropdown={true}
        />
      </div>
      <div className={getFormStyle("fieldsWrapper", density)}>
        {visibleNativeFields.length > 0 && (
          <div className="grid grid-cols-1 gap-0">
            {visibleNativeFields.map(renderField)}
          </div>
        )}
      </div>
    </div>
  );
};

const EntityFormRecordSelections: React.FC<UnifiedLayoutProps> = (
  unifiedLayoutProps
) => {
  const entityKey = unifiedLayoutProps.layoutState.selectedEntity || null;
  const selectors = useMemo(
    () => createEntitySelectors(entityKey),
    [entityKey]
  );
  const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);

  if (!selectedRecordIds?.length) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      {selectedRecordIds.map((recordId) => (
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