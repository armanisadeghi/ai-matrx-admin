'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useSelectQuickRef } from '@/app/entities/hooks/useSelectQuickRef';
import { FetchMode } from '@/lib/redux/entity/actions';
import { EntityKeys } from '@/types/entityTypes';
import { selectEntitySelectText, useAppSelector } from '@/lib/redux';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';

interface QuickRefSelectFindNewProps {
    entityKey?: EntityKeys;
    initialSelectedRecord?: QuickReferenceRecord;
    initialRecordKey?: MatrxRecordId;
    onRecordChange: (record: QuickReferenceRecord) => void;
    fetchMode?: FetchMode;
    resetKey?: MatrxRecordId;
}

export const QuickRefSelectFindNew: React.FC<QuickRefSelectFindNewProps> = ({ 
    entityKey, 
    initialSelectedRecord, 
    initialRecordKey,
    onRecordChange, 
    fetchMode = 'fkIfk',
    resetKey
}) => {
    const selectText = useAppSelector((state) => selectEntitySelectText(state, entityKey));
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 200;
    const previousLengthRef = useRef<number>(0);
    
    const [selectedRecordKey, setSelectedRecordKey] = useState<MatrxRecordId>(
        initialSelectedRecord?.recordKey || ''
    );

    const { handleRecordSelect, quickReferenceRecords, setFetchMode } = useSelectQuickRef(entityKey);

    useFetchQuickRef(entityKey);

    const findAndSetNewRecord = useCallback((shouldRetry = false) => {
        if (quickReferenceRecords?.length) {
            // Check if we have a new record by comparing lengths
            if (quickReferenceRecords.length > previousLengthRef.current) {
                // Get the latest record (assuming it's the new one)
                const latestRecord = quickReferenceRecords[quickReferenceRecords.length - 1];
                setSelectedRecordKey(latestRecord.recordKey);
                onRecordChange(latestRecord);
                handleRecordSelect(latestRecord.recordKey);
                retryCountRef.current = 0;
                previousLengthRef.current = quickReferenceRecords.length;
                return true;
            } else if (shouldRetry && retryCountRef.current < MAX_RETRIES) {
                retryTimeoutRef.current = setTimeout(() => {
                    retryCountRef.current += 1;
                    findAndSetNewRecord(true);
                }, RETRY_DELAY);
                return false;
            }
        }
        previousLengthRef.current = quickReferenceRecords?.length || 0;
        return false;
    }, [quickReferenceRecords, onRecordChange, handleRecordSelect]);

    const findAndSetRecord = useCallback((recordKey: MatrxRecordId) => {
        if (quickReferenceRecords?.length) {
            const record = quickReferenceRecords.find(r => r.recordKey === recordKey);
            if (record) {
                setSelectedRecordKey(recordKey);
                onRecordChange(record);
                handleRecordSelect(recordKey);
                return true;
            }
        }
        return false;
    }, [quickReferenceRecords, onRecordChange, handleRecordSelect]);

    useEffect(() => {
        if (resetKey) {
            findAndSetNewRecord(true);
        }
    }, [resetKey, findAndSetNewRecord]);

    useEffect(() => {
        if (!initialSelectedRecord && initialRecordKey) {
            findAndSetRecord(initialRecordKey);
        }
    }, [initialRecordKey, initialSelectedRecord, findAndSetRecord]);

    useEffect(() => {
        if (initialSelectedRecord) {
            setSelectedRecordKey(initialSelectedRecord.recordKey);
            onRecordChange(initialSelectedRecord);
        }
    }, [initialSelectedRecord, onRecordChange]);

    useEffect(() => {
        setFetchMode(fetchMode);
    }, [fetchMode, setFetchMode]);

    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRecordKey = e.target.value as MatrxRecordId;
        setSelectedRecordKey(newRecordKey);

        if (quickReferenceRecords?.length) {
            const selectedRecord = quickReferenceRecords.find(
                record => record.recordKey === newRecordKey
            );
            if (selectedRecord) {
                onRecordChange(selectedRecord);
                handleRecordSelect(newRecordKey);
            }
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

export default QuickRefSelectFindNew;