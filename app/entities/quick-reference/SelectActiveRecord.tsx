'use client';

import React, { useEffect, useCallback } from 'react';
import { MatrxRecordId, QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import { FetchMode } from '@/lib/redux/entity/actions';
import { EntityKeys } from '@/types/entityTypes';
import { selectEntitySelectText, useAppSelector } from '@/lib/redux';
import { useSelectActiveRecord } from '../hooks/useFetchQuickRefSingleMode';

interface QuickRefSelectProps {
    entityKey?: EntityKeys;
    initialSelectedRecord?: QuickReferenceRecord | null;
    onRecordChange?: (record: QuickReferenceRecord) => void;
    fetchMode?: FetchMode;
}

export const SelectActiveRecord: React.FC<QuickRefSelectProps> = ({ entityKey, initialSelectedRecord = null, onRecordChange, fetchMode = 'fkIfk' }) => {
    const selectText = useAppSelector((state) => selectEntitySelectText(state, entityKey));

    const { activeRecordkey, quickReferenceRecords, setFetchMode, setSelectedRecordKey } = useSelectActiveRecord(entityKey);

    useEffect(() => {
        setFetchMode(fetchMode);
        if (initialSelectedRecord) {
            setSelectedRecordKey(initialSelectedRecord.recordKey);
        }
    }, []);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newRecordKey = e.target.value as MatrxRecordId;

            if (quickReferenceRecords) {
                const selectedRecord = quickReferenceRecords.find((record) => record.recordKey === newRecordKey);

                if (selectedRecord) {
                    setSelectedRecordKey(newRecordKey);
                    onRecordChange?.(selectedRecord);
                }
            }
        },
        [quickReferenceRecords, onRecordChange, setSelectedRecordKey]
    );

    const currentValue = activeRecordkey || initialSelectedRecord?.recordKey || '';

    return (
        <select
            className='w-full min-w-0 bg-elevation1 rounded-md p-2 text-sm'
            value={currentValue}
            onChange={handleChange}
        >
            <option value=''>{selectText}</option>
            {quickReferenceRecords?.map((record) => (
                <option
                    key={record.recordKey}
                    value={record.recordKey}
                    className='text-ellipsis overflow-hidden'
                >
                    {record.displayValue}
                </option>
            ))}
        </select>
    );
};

export default SelectActiveRecord;
