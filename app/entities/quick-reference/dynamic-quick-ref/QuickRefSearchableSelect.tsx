import React from 'react';
import { MatrxRecordId, QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useQuickRef } from '../../hooks/useQuickRef';
import { FetchMode } from '@/lib/redux/entity/actions';
import { EntityKeys } from '@/types';
import { selectEntityPrettyName, selectEntitySelectText, useAppSelector } from '@/lib/redux';
import SearchableSelect from '@/components/matrx/SearchableSelect';

interface QuickRefSearchableSelectProps {
    entityKey?: EntityKeys;
    initialSelectedRecord?: QuickReferenceRecord;
    onRecordChange?: (record: QuickReferenceRecord) => void;
    fetchMode?: FetchMode;
}

export const QuickRefSearchableSelect: React.FC<QuickRefSearchableSelectProps> = ({
    entityKey,
    initialSelectedRecord,
    onRecordChange,
    fetchMode = 'fkIfk',
}) => {
    const selectText = useAppSelector((state) => selectEntitySelectText(state, entityKey));

    const entityPrettyName = useAppSelector((state) => selectEntityPrettyName(state, entityKey));

    useFetchQuickRef(entityKey);

    const { handleAddToSelection, quickReferenceRecords, setFetchMode, setSelectionMode, entityDisplayName } = useQuickRef(entityKey);

    
    React.useEffect(() => {
      setSelectionMode('multiple');
  }, [setSelectionMode]);

    React.useEffect(() => {
        setFetchMode(fetchMode);
    }, [entityKey, setFetchMode, fetchMode]);

    React.useEffect(() => {
        if (initialSelectedRecord) {
          handleAddToSelection(initialSelectedRecord.recordKey);
        }
    }, [initialSelectedRecord, onRecordChange, handleAddToSelection]);

    const options = React.useMemo(
        () =>
            quickReferenceRecords?.map((record) => ({
                value: record.recordKey,
                label: record.displayValue,
            })) || [],
        [quickReferenceRecords]
    );

    return (
        <SearchableSelect
            options={options}
            value={initialSelectedRecord?.recordKey}
            onChange={(option) => {
              const record = quickReferenceRecords?.find((r) => r.recordKey === option.value);
              if (record) {
                handleAddToSelection(record.recordKey);
              }
          }}
          placeholder={selectText}
            searchPlaceholder={`Search ${entityPrettyName} Records...`}
        />
    );
};

export default QuickRefSearchableSelect;
