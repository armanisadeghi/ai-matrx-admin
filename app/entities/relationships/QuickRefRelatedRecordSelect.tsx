'use client';

import React, { useEffect } from 'react';
import { MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useSelectQuickRef } from '@/app/entities/hooks/useSelectQuickRef';
import { FetchMode } from '@/lib/redux/entity/actions';
import { EntityKeys } from '@/types';
import { selectEntitySelectText, useAppSelector } from '@/lib/redux';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';

interface QuickRefSelectProps {
    entityKey?: EntityKeys;
    recordKey?: MatrxRecordId;
    onRecordChange: (record: QuickReferenceRecord) => void;
    fetchMode?: FetchMode;
    disabled?: boolean;
    className?: string;
    dynamicFieldInfo?: any;
}

export const QuickRefRelatedRecordSelect: React.FC<QuickRefSelectProps> = ({
    entityKey,
    recordKey,
    onRecordChange,
    fetchMode = 'native'
}) => {
    const selectText = useAppSelector((state) => selectEntitySelectText(state, entityKey));

    useEffect(() => {
        if (recordKey) {
            handleRecordSelect(recordKey);
        }
    }, []);

    // Fetch quick references
    useFetchQuickRef(entityKey);

    const {
        handleRecordSelect,
        quickReferenceRecords,
        setFetchMode,
        activeRecordId
    } = useSelectQuickRef(entityKey);

    // Set fetch mode when it changes
    useEffect(() => {
        setFetchMode(fetchMode);
    }, [entityKey, setFetchMode, fetchMode]);

    // Handle selection change
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRecordKey = e.target.value as MatrxRecordId;

        // Find the complete record to pass to parent
        const selectedRecord = quickReferenceRecords?.find(
            (record) => record.recordKey === newRecordKey
        );

        if (selectedRecord) {
            onRecordChange(selectedRecord);
            handleRecordSelect(newRecordKey);
        }
    };

    return (
        <select
            className="w-full min-w-0 bg-elevation1 rounded-md p-2 text-sm"
            value={activeRecordId || ''}
            onChange={handleChange}
        >
            <option value="">{selectText}</option>
            {quickReferenceRecords?.map((record) => (
                <option
                    key={record.recordKey}
                    value={record.recordKey}
                    className="text-ellipsis overflow-hidden"
                >
                    {record.displayValue}
                </option>
            ))}
        </select>
    );
};

export default QuickRefRelatedRecordSelect;