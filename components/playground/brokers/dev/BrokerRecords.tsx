'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useQuickRef } from '@/app/entities/hooks/useQuickRef';
import { useAppSelector, useEntityTools } from '@/lib/redux';
import { useEditorContext } from '@/features/rich-text-editor/provider/new/EditorProvider';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import ChipDisplay from './ChipDisplay';
import BrokerDisplayCard from './BrokerDisplayCard';

const BrokerRecords = ({ unifiedLayoutProps }: { unifiedLayoutProps: UnifiedLayoutProps }) => {
    const entityName = 'dataBroker' as EntityKeys;
    const { selectors } = useEntityTools(entityName);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const context = useEditorContext();
    const { handleToggleSelection, setSelectionMode } = useQuickRef(entityName);
    const { quickReferenceRecords } = useFetchQuickRef('dataBroker');

    // Memoize broker references for quick lookup
    const brokerMap = useMemo(() => {
        return quickReferenceRecords?.reduce((acc, broker) => {
            acc[broker.recordKey] = broker;
            return acc;
        }, {} as Record<string, typeof quickReferenceRecords[0]>) || {};
    }, [quickReferenceRecords]);

    // Get unmatched chips (excluding those that are already displayed in broker cards)
    const unmatchedChips = useMemo(() => {
        const allChips = context.chips.getAllChipData() || [];
        return allChips.filter(chip => {
            if (!chip.editorId) return false;
            // Filter out chips that are already matched with displayed brokers
            if (chip.brokerId && selectedRecords[chip.brokerId]) return false;
            return true;
        });
    }, [context, selectedRecords]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setSelectionMode('multiple');
        }, 0);
        return () => clearTimeout(timeoutId);
    }, []);

    const handleRemove = useCallback(
        (recordId: MatrxRecordId) => {
            handleToggleSelection(recordId);
        },
        [handleToggleSelection]
    );

    const handleChipUpdate = useCallback(
        (chipId: string, updates: Partial<ChipData>) => {
            context.chips.updateChipData(chipId, updates);
        },
        [context]
    );

    const selectedBrokers = useMemo(() => 
        Object.entries(selectedRecords).map(([recordId, record]) => ({
            recordId,
            record,
        })),
        [selectedRecords]
    );

    return (
        <div className="w-full space-y-2">
            {selectedBrokers.map(({ recordId, record }) => (
                <BrokerDisplayCard
                    key={recordId}
                    recordId={recordId}
                    record={record}
                    unifiedLayoutProps={unifiedLayoutProps}
                    onDelete={handleRemove}
                />
            ))}
            
            {unmatchedChips.map(chip => (
                <ChipDisplay
                    key={chip.id}
                    chip={chip}
                    brokers={quickReferenceRecords || []}
                    onUpdate={handleChipUpdate}
                />
            ))}
        </div>
    );
};

export default BrokerRecords;