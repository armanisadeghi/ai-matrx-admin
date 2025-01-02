import React from "react";
import { Plus } from "lucide-react";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { useFetchQuickRef } from "@/app/entities/hooks/useFetchQuickRef";
import { useSelectQuickRef } from "@/app/entities/hooks/useSelectQuickRef";
import { FetchMode } from "@/lib/redux/entity/actions";
import { EntityKeys } from "@/types";
import { selectEntityPrettyName, selectEntitySelectText, useAppSelector } from "@/lib/redux";
import CommandIconButton from "@/components/matrx/CommandIconButton";

export type QuickReferenceRecord = {
  recordKey: MatrxRecordId;
  displayValue: string;
};

interface QuickRefCommandIconProps {
  entityKey?: EntityKeys;
  initialSelectedRecord?: QuickReferenceRecord;
  onRecordChange: (record: QuickReferenceRecord) => void;
  fetchMode?: FetchMode;
  size?: number;
  title?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export const QuickRefCommandIcon: React.FC<QuickRefCommandIconProps> = ({
  entityKey,
  initialSelectedRecord,
  onRecordChange,
  fetchMode = "fkIfk",
  size,
  title,
  className,
  disabled,
  ariaLabel,
}) => {
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

  // Convert QuickReferenceRecord[] to CommandOption[]
  const options = React.useMemo(() => 
    quickReferenceRecords?.map(record => ({
      value: record.recordKey,
      label: record.displayValue
    })) || [],
    [quickReferenceRecords]
  );

  return (
    <CommandIconButton
      icon={Plus}
      options={options}
      onSelect={(option) => {
        const record = quickReferenceRecords?.find(r => r.recordKey === option.value);
        if (record) {
          handleRecordSelect(record.recordKey);
          onRecordChange(record);
        }
      }}
      size={size}
      title={title}
      className={className}
      disabled={disabled}
      ariaLabel={ariaLabel}
      searchPlaceholder={`Search ${entityPrettyName?.toLowerCase()}...`}
    />
  );
};

export default QuickRefCommandIcon;