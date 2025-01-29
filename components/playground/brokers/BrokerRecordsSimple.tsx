'use client';

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { DataBrokerDataOptional, EntityKeys, MatrxRecordId, MessageBrokerDataOptional } from '@/types';
import { useAppSelector, useEntityTools } from '@/lib/redux';
import { useEditorContext } from '@/features/rich-text-editor/provider/provider';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';
import BrokerDisplayCard from './BrokerDisplayCard';
import { useEnhancedFetch } from '@/app/entities/hooks/useEntityFetch';
import { useDeleteRecord } from '@/app/entities/hooks/crud/useDeleteRecord';
import { toPkValue } from '@/lib/redux/entity/utils/entityPrimaryKeys';
import ChipDisplay from './dev/ChipDisplay';

export type DataBrokerData = {
    id: string;
    name: string;
    dataType?: string;
    defaultValue?: string;
    defaultComponent?: string;
    color?: string;
    messageBrokerInverse?: MessageBrokerDataOptional[];
};

export interface EnhancedBrokerRecord {
    needsFetch: boolean;
    recordKey: string;
    data?: DataBrokerData;
}

const BrokerRecordsSimple = ({ unifiedLayoutProps }: { unifiedLayoutProps: UnifiedLayoutProps }) => {
    const [canProcess, setCanProcess] = useState(false);
    const entityName = 'dataBroker' as EntityKeys;
    const { selectors } = useEntityTools(entityName);
    const selectedBrokers = useAppSelector(selectors.selectSelectedEnhancedRecords);
    const context = useEditorContext();
    const messagesLoading = context.messagesLoading;
    const { quickReferences, isLoading: quickRefLoading, getOrFetchRecord, enhancedRecords } = useEnhancedFetch(entityName);
    const isLoading = quickRefLoading || messagesLoading;

    const { deleteRecord: removeRelationship } = useDeleteRecord('messageBroker');

    useEffect(() => {
        if (isLoading) {
            setCanProcess(false);
            return;
        }

        const timer = setTimeout(() => {
            setCanProcess(true);
        }, 400);

        return () => clearTimeout(timer);
    }, [isLoading]);

    // Create a Set of selected broker IDs for O(1) lookup
    const selectedBrokerIds = useMemo(() => {
        return new Set(selectedBrokers.map((broker) => broker.recordKey));
    }, [selectedBrokers]);

    // Get unmatched chips (excluding those that are already displayed in broker cards)
    const unmatchedChips = useMemo(() => {
        const allChips = context.getAllChips();
        return allChips.filter((chip) => {
            if (!chip.brokerId) return true;

            // Check if this broker is already selected
            if (selectedBrokerIds.has(chip.brokerId)) return false;

            // Find the broker in enhanced records
            const brokerRecord = enhancedRecords.find((record) => record.recordKey === chip.brokerId);

            if (brokerRecord) {
                if (brokerRecord.needsFetch) {
                    getOrFetchRecord(chip.brokerId);
                }
                return false;
            }

            return true;
        });
    }, [context, selectedBrokerIds, enhancedRecords, getOrFetchRecord]);

    const handleRemove = useCallback(
        (recordId: MatrxRecordId) => {
            const broker = enhancedRecords[recordId];
            const messageBrokerId = broker?.data?.messageBrokerInverse?.[0]?.id;
            if (messageBrokerId) {
                removeRelationship(toPkValue(messageBrokerId));
            }
        },
        [enhancedRecords, removeRelationship]
    );

    const handleChipUpdate = useCallback(
        (chipId: string, updates: Partial<ChipData>) => {
            context.chips.updateChipData(chipId, updates);
        },
        [context]
    );

    return (
        <div className='w-full'>
            {selectedBrokers.map(({ recordKey, data }) => (
                <BrokerDisplayCard
                    key={recordKey}
                    recordId={recordKey}
                    record={data}
                    chips={unmatchedChips}
                    unifiedLayoutProps={unifiedLayoutProps}
                    onDelete={handleRemove}
                />
            ))}

            {unmatchedChips.map((chip) => (
                <ChipDisplay
                    key={chip.id}
                    chip={chip}
                    brokers={quickReferences || []}
                    onUpdate={handleChipUpdate}
                />
            ))}
        </div>
    );
};

export default BrokerRecordsSimple;
