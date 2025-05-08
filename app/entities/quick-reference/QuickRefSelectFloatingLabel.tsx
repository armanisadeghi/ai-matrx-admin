"use client";

import React, { useEffect, useState } from "react";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";
import { useSelectQuickRef } from "@/app/entities/hooks/useSelectQuickRef";
import { FetchMode } from "@/lib/redux/entity/actions";
import { EntityKeys } from "@/types";
import { selectEntitySelectText, useAppSelector } from "@/lib/redux";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";

interface QuickRefSelectProps {
  entityKey?: EntityKeys;
  initialSelectedRecord?: QuickReferenceRecord;
  initialSelectedRecordKey?: MatrxRecordId;
  onRecordChange?: (record: QuickReferenceRecord) => void;
  onSelect?: (recordId: MatrxRecordId) => void;
  fetchMode?: FetchMode;
  customSelectText?: string;
  disabled?: boolean;
}

export const QuickRefSelect: React.FC<QuickRefSelectProps> = ({
  entityKey,
  initialSelectedRecord,
  initialSelectedRecordKey,
  onRecordChange,
  onSelect,
  fetchMode = "fkIfk",
  customSelectText,
  disabled = false,
}) => {
  const selectText = useAppSelector((state) =>
    selectEntitySelectText(state, entityKey)
  );

  // Use customSelectText if provided, otherwise use the default from the store
  const displaySelectText = customSelectText || selectText;
  
  // Initialize state from props - use empty string for invalid values
  const [selectedRecordKey, setSelectedRecordKey] = useState<MatrxRecordId>(() => {
    // Only use initialValues if they are truthy and not empty strings
    const recordKeyFromRecord = initialSelectedRecord?.recordKey || "";
    const recordKey = recordKeyFromRecord || (initialSelectedRecordKey || "");
    return recordKey;
  });

  // Fetch quick references
  useFetchQuickRef(entityKey);

  const { activeRecordId, handleRecordSelect, quickReferenceRecords, setFetchMode } =
    useSelectQuickRef(entityKey);
  
  // Set fetch mode when it changes
  useEffect(() => {
    setFetchMode(fetchMode);
  }, [entityKey, setFetchMode, fetchMode]);

  // Handle initial record or record key
  useEffect(() => {
    // Handle initialSelectedRecord
    if (initialSelectedRecord?.recordKey) {
      setSelectedRecordKey(initialSelectedRecord.recordKey);
      onRecordChange?.(initialSelectedRecord);
      return;
    }
    
    // Handle initialSelectedRecordKey
    if (initialSelectedRecordKey && initialSelectedRecordKey !== selectedRecordKey) {
      // Verify the key exists in the records if we have records loaded
      if (quickReferenceRecords?.length) {
        const record = quickReferenceRecords.find(
          (r) => r.recordKey === initialSelectedRecordKey
        );
        
        if (record) {
          setSelectedRecordKey(initialSelectedRecordKey);
          onRecordChange?.(record);
        } else {
          // Key is invalid, reset to empty selection
          setSelectedRecordKey("");
        }
      } else {
        // No records loaded yet, set the key but we'll verify later
        setSelectedRecordKey(initialSelectedRecordKey);
      }
    } else if (initialSelectedRecordKey === null || initialSelectedRecordKey === undefined) {
      // Reset to empty for null/undefined keys
      setSelectedRecordKey("");
    }
  }, [initialSelectedRecord, initialSelectedRecordKey, quickReferenceRecords, onRecordChange, selectedRecordKey]);

  // When quickReferenceRecords loads and we have initialSelectedRecordKey but no record yet
  useEffect(() => {
    if (initialSelectedRecordKey && quickReferenceRecords?.length && !initialSelectedRecord) {
      const record = quickReferenceRecords.find(
        (r) => r.recordKey === initialSelectedRecordKey
      );
      
      if (record) {
        onRecordChange?.(record);
      } else {
        // Record not found after loading, reset to empty
        setSelectedRecordKey("");
      }
    }
  }, [quickReferenceRecords, initialSelectedRecordKey, initialSelectedRecord, onRecordChange]);

  // Handle selection change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRecordKey = e.target.value as MatrxRecordId;
    setSelectedRecordKey(newRecordKey);
    
    // Find the complete record to pass to parent
    const selectedRecord = quickReferenceRecords?.find(
      (record) => record.recordKey === newRecordKey
    );
    
    if (selectedRecord) {
      onRecordChange?.(selectedRecord);
      handleRecordSelect(newRecordKey);
    }
    
    // Call onSelect with just the record id
    onSelect?.(newRecordKey);
  };

  // Only update from activeRecordId if not controlled by props
  useEffect(() => {
    if (!activeRecordId || initialSelectedRecordKey || initialSelectedRecord) return;
    setSelectedRecordKey(activeRecordId);
  }, [activeRecordId, initialSelectedRecordKey, initialSelectedRecord]);

  return (
    <select
      className="w-full min-w-0 bg-elevation1 rounded-md p-2 text-sm"
      value={selectedRecordKey}
      onChange={handleChange}
      disabled={disabled}
    >
      <option value="">{displaySelectText}</option>
      {quickReferenceRecords?.map((record) => (
        <option key={record.recordKey} value={record.recordKey} className="text-ellipsis overflow-hidden">
          {record.displayValue}
        </option>
      ))}
    </select>
  );
};

export default QuickRefSelect;