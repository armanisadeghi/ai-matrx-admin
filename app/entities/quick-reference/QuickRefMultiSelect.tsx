'use client';

import React from "react";
import { MatrxRecordId, QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";
import { useSelectQuickRef } from "@/app/entities/hooks/useSelectQuickRef";
import { FetchMode } from "@/lib/redux/entity/actions";
import { EntityKeys } from "@/types";
import { 
  selectEntityPrettyName, 
  selectEntitySelectText, 
  useAppSelector, 
  createEntitySelectors 
} from "@/lib/redux";
import SearchableMultiSelect from "@/components/matrx/SearchableMultiSelect";

interface QuickRefMultiSelectProps {
  entityKey?: EntityKeys;
  initialSelectedRecords?: QuickReferenceRecord[];
  onRecordsChange: (records: QuickReferenceRecord[]) => void;
  fetchMode?: FetchMode;
}

export const QuickRefMultiSelect: React.FC<QuickRefMultiSelectProps> = ({
  entityKey,
  initialSelectedRecords = [],
  onRecordsChange,
  fetchMode = "fkIfk",
}) => {
  const selectText = useAppSelector((state) =>
    selectEntitySelectText(state, entityKey)
  );
  
  const entityPrettyName = useAppSelector((state) =>
    selectEntityPrettyName(state, entityKey)
  );

  const selectors = React.useMemo(() => createEntitySelectors(entityKey), [entityKey]);
  const selectedRecordIds = useAppSelector(selectors.selectSelectedRecordIds);

  useFetchQuickRef(entityKey);

  const { 
    handleRecordSelect, 
    quickReferenceRecords, 
    setFetchMode,
    toggleSelectionMode 
  } = useSelectQuickRef(entityKey);

  // Set multi-select mode on mount
  React.useEffect(() => {
    toggleSelectionMode();
  }, [toggleSelectionMode]);

  // Initialize fetch mode
  React.useEffect(() => {
    setFetchMode(fetchMode);
  }, [entityKey, setFetchMode, fetchMode]);

  // Handle initial selections
  React.useEffect(() => {
    if (initialSelectedRecords?.length) {
      initialSelectedRecords.forEach(record => {
        handleRecordSelect(record.recordKey);
      });
      onRecordsChange(initialSelectedRecords);
    }
  }, []);

  const options = React.useMemo(() => 
    quickReferenceRecords?.map(record => ({
      value: record.recordKey,
      label: record.displayValue
    })) || [],
    [quickReferenceRecords]
  );

  const handleOptionSelect = React.useCallback((option: { value: string, label: string }, isSelected: boolean) => {
    const record = quickReferenceRecords?.find(r => r.recordKey === option.value);
    if (record) {
      handleRecordSelect(record.recordKey);
      
      const updatedRecords = quickReferenceRecords.filter(r => 
        isSelected 
          ? [...selectedRecordIds, record.recordKey].includes(r.recordKey)
          : selectedRecordIds.filter(id => id !== record.recordKey).includes(r.recordKey)
      );
      
      onRecordsChange(updatedRecords);
    }
  }, [quickReferenceRecords, handleRecordSelect, onRecordsChange, selectedRecordIds]);

  return (
    <SearchableMultiSelect
      options={options}
      selectedValues={selectedRecordIds}
      onOptionSelect={handleOptionSelect}
      placeholder={selectText}
      searchPlaceholder={`Search ${entityPrettyName?.toLowerCase()}...`}
      className="w-full"
    />
  );
};

export default QuickRefMultiSelect;