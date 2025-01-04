'use client';
import React from 'react';
import { MatrxRecordId, QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useQuickRef } from '../hooks/useQuickRef';
import { FetchMode } from '@/lib/redux/entity/actions';
import { EntityKeys } from '@/types';
import { selectEntitySelectText, useAppSelector } from '@/lib/redux';

import SearchableMultiSelect from '@/components/matrx/SearchableMultiSelect';

interface QuickRefMultiSelectProps {
    entityKey: EntityKeys;
    initialSelectedRecords?: QuickReferenceRecord[];
    onRecordsChange: (records: QuickReferenceRecord[]) => void;
    fetchMode?: FetchMode;
}

export const QuickRefMultiSelect: React.FC<QuickRefMultiSelectProps> = ({ entityKey, initialSelectedRecords = [], onRecordsChange, fetchMode = 'fkIfk' }) => {
    const selectText = useAppSelector((state) => selectEntitySelectText(state, entityKey));

    useFetchQuickRef(entityKey);

    const { handleAddToSelection, quickReferenceRecords, setFetchMode, setSelectionMode, entityDisplayName, selectedRecordIds } = useQuickRef(entityKey);

    React.useEffect(() => {
        setSelectionMode('multiple');
    }, [setSelectionMode]);

    React.useEffect(() => {
        setFetchMode(fetchMode);
    }, [entityKey, setFetchMode, fetchMode]);

    // Handle initial selections
    React.useEffect(() => {
        if (initialSelectedRecords?.length) {
            initialSelectedRecords.forEach((record) => {
                handleAddToSelection(record.recordKey);
            });
            onRecordsChange(initialSelectedRecords);
        }
    }, []);

    const options = React.useMemo(
        () =>
            quickReferenceRecords?.map((record) => ({
                value: record.recordKey,
                label: record.displayValue,
            })) || [],
        [quickReferenceRecords]
    );

    const handleOptionSelect = React.useCallback(
        (option: { value: MatrxRecordId; label: string }, isSelected: boolean) => {
            const record = quickReferenceRecords?.find((r) => r.recordKey === option.value);
            if (record) {
                handleAddToSelection(record.recordKey);

                const updatedRecords = quickReferenceRecords.filter((r) =>
                    isSelected
                        ? [...selectedRecordIds, record.recordKey].includes(r.recordKey)
                        : selectedRecordIds.filter((id) => id !== record.recordKey).includes(r.recordKey)
                );

                onRecordsChange(updatedRecords);
            }
        },
        [quickReferenceRecords, handleAddToSelection, onRecordsChange, selectedRecordIds]
    );

    return (
        <SearchableMultiSelect
            options={options}
            selectedValues={selectedRecordIds}
            onOptionSelect={handleOptionSelect}
            placeholder={selectText}
            searchPlaceholder={`Search ${entityDisplayName} Records...`}
            className='w-full'
        />
    );
};

export default QuickRefMultiSelect;
