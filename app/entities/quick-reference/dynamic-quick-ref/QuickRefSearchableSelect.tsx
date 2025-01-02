import React from "react";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";
import { useSelectQuickRef } from "@/app/entities/hooks/useSelectQuickRef";
import { FetchMode } from "@/lib/redux/entity/actions";
import { EntityKeys } from "@/types";
import { selectEntityPrettyName, selectEntitySelectText, useAppSelector } from "@/lib/redux";
import SearchableSelect from "@/components/matrx/SearchableSelect";


export type QuickReferenceRecord = {
  recordKey: MatrxRecordId;
  displayValue: string;
};

interface QuickRefSearchableSelectProps {
  entityKey?: EntityKeys;
  initialSelectedRecord?: QuickReferenceRecord;
  onRecordChange: (record: QuickReferenceRecord) => void;
  fetchMode?: FetchMode;
}

export const QuickRefSearchableSelect: React.FC<QuickRefSearchableSelectProps> = ({
  entityKey,
  initialSelectedRecord,
  onRecordChange,
  fetchMode = "fkIfk",
}) => {
  const selectText = useAppSelector((state) =>
    selectEntitySelectText(state, entityKey)
  );
  
  const entityPrettyName = useAppSelector((state) =>
    selectEntityPrettyName(state, entityKey)
  );

  useFetchQuickRef(entityKey);

  const { handleRecordSelect, quickReferenceRecords, setFetchMode } =
    useSelectQuickRef(entityKey);

  React.useEffect(() => {
    setFetchMode(fetchMode);
  }, [entityKey, setFetchMode, fetchMode]);

  React.useEffect(() => {
    if (initialSelectedRecord) {
      handleRecordSelect(initialSelectedRecord.recordKey);
      onRecordChange(initialSelectedRecord);
    }
  }, [initialSelectedRecord, onRecordChange, handleRecordSelect]);

  // Convert QuickReferenceRecord[] to Option[]
  const options = React.useMemo(() => 
    quickReferenceRecords?.map(record => ({
      value: record.recordKey,
      label: record.displayValue
    })) || [],
    [quickReferenceRecords]
  );

  return (
    <SearchableSelect
      options={options}
      value={initialSelectedRecord?.recordKey}
      onChange={(option) => {
        const record = quickReferenceRecords?.find(r => r.recordKey === option.value);
        if (record) {
          handleRecordSelect(record.recordKey);
          onRecordChange(record);
        }
      }}
      placeholder={selectText}
      searchPlaceholder={`Search ${entityPrettyName?.toLowerCase()}...`}
    />
  );
};

export default QuickRefSearchableSelect;