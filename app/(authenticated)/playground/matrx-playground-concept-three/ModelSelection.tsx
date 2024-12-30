"use client";

import React, { useEffect } from "react";
import { useSelectQuickRef } from "../../tests/forms/entity-final-test/hooks/useSelectQuickRef";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { useFetchQuickRef } from "../../tests/forms/entity-final-test/hooks/useFetchQuickRef";

interface ModelSelectProps {
  provider: MatrxRecordId; // This will be used later for filtering
  model: MatrxRecordId; // Add this prop for the selected model
  setModel: (model: MatrxRecordId) => void;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  provider, // We'll use this later for filtering
  model,    // Current selected model
  setModel,
}) => {
  const entityKey = "aiModel";
  const fetchMode = "fkIfk";
  useFetchQuickRef(entityKey);

  const { handleRecordSelect, quickReferenceRecords, setFetchMode } =
    useSelectQuickRef(entityKey);

  useEffect(() => {
    setFetchMode(fetchMode);
  }, [entityKey, setFetchMode, fetchMode]);

  // Handle selection change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRecordKey = e.target.value as MatrxRecordId;
    setModel(selectedRecordKey);
    handleRecordSelect(selectedRecordKey);
  };

  return (
    <select
      className="flex-1 bg-elevation1 rounded-md p-2 text-sm"
      value={model} // Use model instead of provider
      onChange={handleChange}
    >
      <option value="">Select a Model</option>
      {quickReferenceRecords?.map((record) => (
        <option key={record.recordKey} value={record.recordKey}>
          {record.displayValue}
        </option>
      ))}
    </select>
  );
};

export default ModelSelect;