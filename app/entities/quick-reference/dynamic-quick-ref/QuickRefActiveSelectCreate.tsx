'use client';

import React from 'react';
import { MatrxRecordId } from '@/lib/redux/entity/types/stateTypes';
import { FetchMode } from '@/lib/redux/entity/actions';
import { EntityKeys } from '@/types';
import { selectEntitySelectText, useAppSelector } from '@/lib/redux';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import { useFetchQuickRefSingleMode } from '../../hooks/useFetchQuickRefSingleMode';
import { Button } from '@/components/ui/button';
import EntitySheetForm from '../../forms/EntitySheetForm';
import { PlusCircle } from 'lucide-react';

interface QuickRefActiveSelectCreateProps {
    entityKey: EntityKeys;
    simpleKey?: string;
    recordKey?: MatrxRecordId;
    onRecordChange?: (record: QuickReferenceRecord) => void;
    fetchMode?: FetchMode;
}

export const QuickRefActiveSelectCreate: React.FC<QuickRefActiveSelectCreateProps> = ({
    entityKey,
    simpleKey,
    recordKey,
    onRecordChange,
    fetchMode = 'fkIfk',
}) => {
    const [isCreateOpen, setCreateOpen] = React.useState(false);

    const { quickReferenceRecords, activeRecordId, setActiveByRecordKey, setActiveBySimpleKey, setFetchMode } = useFetchQuickRefSingleMode(entityKey);

    const selectText = useAppSelector((state) => selectEntitySelectText(state, entityKey));

    React.useEffect(() => {
        setFetchMode(fetchMode);
    }, [fetchMode, setFetchMode]);

    React.useEffect(() => {
        if (simpleKey) {
            setActiveBySimpleKey(simpleKey);
        }
    }, [simpleKey, setActiveBySimpleKey]);

    React.useEffect(() => {
        if (recordKey) {
            setActiveByRecordKey(recordKey);
        }
    }, [recordKey, setActiveByRecordKey]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value as MatrxRecordId;
        if (newValue) {
            setActiveByRecordKey(newValue);
            const selectedRecord = quickReferenceRecords?.find((record) => record.recordKey === newValue);
            if (selectedRecord && onRecordChange) {
                onRecordChange(selectedRecord);
            }
        }
    };

    const handleCreateComplete = (record: QuickReferenceRecord) => {
        setActiveByRecordKey(record.recordKey);
        if (onRecordChange) {
            onRecordChange(record);
        }
        setCreateOpen(false);
    };

    return (
        <div className='flex items-center gap-1'>
            <select
                className='flex-1 min-w-0 bg-elevation1 rounded-md p-2 text-sm'
                value={activeRecordId || ''}
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
            <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 p-0'
                onClick={() => setCreateOpen(true)}
            >
                <PlusCircle className='h-4 w-4' />
            </Button>
            <EntitySheetForm
                mode='create'
                entityName={entityKey}
                open={isCreateOpen}
                onOpenChange={setCreateOpen}
            />
        </div>
    );
};

export default QuickRefActiveSelectCreate;
