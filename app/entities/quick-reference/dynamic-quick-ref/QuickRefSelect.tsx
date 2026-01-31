'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useSelectQuickRef } from '@/app/entities/hooks/useSelectQuickRef';
import { FetchMode } from '@/lib/redux/entity/actions';
import { EntityKeys } from '@/types/entityTypes';
import { selectEntitySelectText, useAppSelector } from '@/lib/redux';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';

interface QuickRefSelectProps {
    entityKey?: EntityKeys;
    initialSelectedRecord?: QuickReferenceRecord;
    initialRecordKey?: MatrxRecordId;
    onRecordChange: (record: QuickReferenceRecord) => void;
    fetchMode?: FetchMode;
}

export const QuickRefSelect: React.FC<QuickRefSelectProps> = ({ 
    entityKey, 
    initialSelectedRecord, 
    initialRecordKey,
    onRecordChange, 
    fetchMode = 'fkIfk' 
}) => {
    const selectText = useAppSelector((state) => selectEntitySelectText(state, entityKey));
    
    // Maintain existing initialization behavior
    const [selectedRecordKey, setSelectedRecordKey] = useState<MatrxRecordId>(
        initialSelectedRecord?.recordKey || ''
    );

    const { handleRecordSelect, quickReferenceRecords, setFetchMode } = useSelectQuickRef(entityKey);

    // Fetch quick references
    useFetchQuickRef(entityKey);

    // Separate initialization effect for initialSelectedRecord (existing behavior)
    useEffect(() => {
        if (initialSelectedRecord) {
            setSelectedRecordKey(initialSelectedRecord.recordKey);
            onRecordChange(initialSelectedRecord);
        }
    }, [initialSelectedRecord]);

    // New effect for initialRecordKey handling
    useEffect(() => {
        if (!initialSelectedRecord && initialRecordKey && quickReferenceRecords?.length) {
            const record = quickReferenceRecords.find(
                (record) => record.recordKey === initialRecordKey
            );
            if (record) {
                setSelectedRecordKey(initialRecordKey);
                onRecordChange(record);
                handleRecordSelect(initialRecordKey);
            }
        }
    }, [initialRecordKey, quickReferenceRecords, initialSelectedRecord]);

    // Set fetch mode
    useEffect(() => {
        setFetchMode(fetchMode);
    }, [fetchMode, setFetchMode]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRecordKey = e.target.value as MatrxRecordId;
        setSelectedRecordKey(newRecordKey);

        const selectedRecord = quickReferenceRecords?.find(
            (record) => record.recordKey === newRecordKey
        );

        if (selectedRecord) {
            onRecordChange(selectedRecord);
            handleRecordSelect(newRecordKey);
        }
    }, [quickReferenceRecords, onRecordChange, handleRecordSelect]);

    return (
        <select
            className='w-full min-w-0 bg-elevation1 rounded-md p-2 text-sm'
            value={selectedRecordKey}
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

export default QuickRefSelect;