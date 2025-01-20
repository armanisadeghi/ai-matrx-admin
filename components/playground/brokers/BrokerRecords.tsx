'use client';

import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, MatrxRecordId } from '@/types';
import { useAppSelector, useEntityTools } from '@/lib/redux';
import { useEditorContext } from '@/features/rich-text-editor/provider/EditorProvider';
import { ChipData } from '@/features/rich-text-editor/types/editor.types';
import BrokerDisplayCard from './BrokerDisplayCard';
import { useFetchQuickRef } from '@/app/entities/hooks/useFetchQuickRef';
import { useSelectQuickRef } from '@/app/entities/hooks/useSelectQuickRef';

interface DisplayCard {
    id: string;
    brokerId?: MatrxRecordId;
    brokerRecord?: any;
    chips: ChipData[];
}

const DEBOUNCE_DELAY = 1000; // 1 second delay

const BrokerRecords = ({ unifiedLayoutProps }: { unifiedLayoutProps: UnifiedLayoutProps }) => {
    const entityName = 'dataBroker' as EntityKeys;
    const { selectors } = useEntityTools(entityName);
    const selectedRecords = useAppSelector(selectors.selectSelectedRecordsWithKey);
    const context = useEditorContext();
    const { quickReferenceRecords } = useFetchQuickRef(entityName);
    const { handleRecordSelect, setSelectionMode } = useSelectQuickRef(entityName);

    // Refs for debouncing
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const latestCardsRef = useRef<DisplayCard[]>([]);

    // Stable state that will only update after debounce period
    const [stableDisplayCards, setStableDisplayCards] = useState<DisplayCard[]>([]);

    useEffect(() => {
        setSelectionMode('multiple');
    }, []);

    const allChips = useMemo(() => context.getAllChipData() || [], [context]);

    // Create the latest version of display cards
    const currentDisplayCards = useMemo(() => {
        const cards: DisplayCard[] = [];
        const processedChips = new Set<string>();

        Object.entries(selectedRecords).forEach(([brokerId, brokerRecord]) => {
            const brokerChips = allChips.filter(chip => 
                chip.editorId && chip.brokerId === brokerId
            );
            
            if (brokerChips.length > 0 || brokerRecord) {
                brokerChips.forEach(chip => processedChips.add(chip.id));
                cards.push({
                    id: brokerId,
                    brokerId,
                    brokerRecord,
                    chips: brokerChips,
                });
            }
        });

        allChips
            .filter(chip => !processedChips.has(chip.id))
            .forEach(chip => {
                cards.push({
                    id: chip.id,
                    chips: [chip],
                });
            });

        return cards;
    }, [selectedRecords, allChips]);

    // Update the latest cards ref and schedule a state update
    useEffect(() => {
        latestCardsRef.current = currentDisplayCards;

        // Clear existing timeout
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Set new timeout
        updateTimeoutRef.current = setTimeout(() => {
            setStableDisplayCards(latestCardsRef.current);
            updateTimeoutRef.current = null;
        }, DEBOUNCE_DELAY);

        // Cleanup
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [currentDisplayCards]);

    const handleRemove = useCallback(
        (recordId: MatrxRecordId) => {
            handleRecordSelect(recordId);
        },
        [handleRecordSelect]
    );

    const handleChipUpdate = useCallback(
        (chipId: string, updates: Partial<ChipData>) => {
            context.updateChipData(chipId, updates);
        },
        [context]
    );

    return (
        <div className="w-full space-y-2">
            {stableDisplayCards.map(card => (
                <BrokerDisplayCard
                    key={card.id}
                    recordId={card.brokerId}
                    record={card.brokerRecord}
                    chips={card.chips}
                    unifiedLayoutProps={unifiedLayoutProps}
                    onDelete={handleRemove}
                    onChipUpdate={handleChipUpdate}
                    brokerOptions={quickReferenceRecords || []}
                />
            ))}
        </div>
    );
};

export default BrokerRecords;