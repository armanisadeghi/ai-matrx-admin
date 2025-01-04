import React from 'react';
import { Plus } from 'lucide-react';
import { MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { FetchMode } from '@/lib/redux/entity/actions';
import { EntityKeys } from '@/types';
import CommandIconButton from '@/components/matrx/CommandIconButton';
import { useQuickRef } from '../../hooks/useQuickRef';

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
    fetchMode = 'fkIfk',
    size,
    title,
    className,
    disabled,
    ariaLabel,
}) => {

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
        <CommandIconButton
            icon={Plus}
            options={options}
            onSelect={(option) => {
                const record = quickReferenceRecords?.find((r) => r.recordKey === option.value);
                if (record) {
                  handleAddToSelection(record.recordKey);
                }
            }}
            size={size}
            title={title}
            className={className}
            disabled={disabled}
            ariaLabel={ariaLabel}
            searchPlaceholder={`Search ${entityDisplayName?.toLowerCase()}...`}
        />
    );
};

export default QuickRefCommandIcon;
