"use client";

import React, { useEffect } from "react";
import { useSelectQuickRef } from "../../tests/forms/entity-final-test/hooks/useSelectQuickRef";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { useFetchQuickRef } from "../../tests/forms/entity-final-test/hooks/useFetchQuickRef";

interface ProviderSelectProps {
  provider: MatrxRecordId; // Updated to use MatrxRecordId instead of string
  setProvider: (provider: MatrxRecordId) => void;
}

export const ProviderSelect: React.FC<ProviderSelectProps> = ({
  provider,
  setProvider,
}) => {
  const entityKey = "aiEndpoint";
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
    setProvider(selectedRecordKey);
    handleRecordSelect(selectedRecordKey);
  };

  console.log("quickReferenceRecords", quickReferenceRecords);

  return (
    <select
      className="flex-1 bg-elevation1 rounded-md p-2 text-sm"
      value={provider}
      onChange={handleChange}
    >
      <option value="">Select a provider</option>
      {quickReferenceRecords?.map((record) => (
        <option key={record.recordKey} value={record.recordKey}>
          {record.displayValue}
        </option>
      ))}
    </select>
  );
};

export default ProviderSelect;
