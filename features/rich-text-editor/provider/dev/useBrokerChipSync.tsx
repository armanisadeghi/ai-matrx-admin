import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/lib/redux';
import { DataBrokerData } from '@/types';
import { isEqual } from 'lodash';
import { EditorState } from '../EditorProvider';
import { ChipData } from '../../types/editor.types';

export type EditorStates = Map<string, EditorState>;

export function logData(data: unknown, name?: string): void {
    if (name) {
        console.log(`${name}:`, JSON.stringify(data, null, 4));
    } else {
        console.log(JSON.stringify(data, null, 4));
    }
}

export function logIfData(data: unknown, name?: string): void {
    if (
        data === undefined || 
        data === null || 
        data === false || 
        (typeof data === 'string' && data.trim() === '') || 
        (Array.isArray(data) && data.length === 0) || 
        (typeof data === 'object' && data !== null && Object.keys(data).length === 0)
    ) {
        return;
    }

    if (name) {
        console.log(`${name}:`, JSON.stringify(data, null, 4));
    } else {
        console.log(JSON.stringify(data, null, 4));
    }
}


export const useBrokerSync = (
    editors: EditorStates,
    setEditors: React.Dispatch<React.SetStateAction<EditorStates>>
) => {
    const brokers = useAppSelector((state) => state.entities.dataBroker.records) as Record<string, DataBrokerData>;
    const brokerUpdates = useAppSelector((state) => state.entities.dataBroker.unsavedRecords) as Record<string, Partial<DataBrokerData>>;

    const prevBrokersRef = useRef<typeof brokers>({});
    const prevUpdatesRef = useRef<typeof brokerUpdates>({});
    const prevChipsRef = useRef<ChipData[]>([]);

    useEffect(() => {
        console.group('🔄 BrokerSync Check');
        logIfData(brokers, 'brokers');
        logIfData(brokerUpdates, 'brokerUpdates');
        logIfData(editors, 'editors');
        console.groupEnd();

        const currentChips: ChipData[] = [];
        editors.forEach(state => currentChips.push(...state.chipData));

        console.group('📊 Current State Details');
        logIfData(currentChips, 'currentChips');
        logIfData(prevChipsRef.current, 'prevChips');
        logIfData(prevBrokersRef.current, 'prevBrokers');
        console.groupEnd();

        const brokersChanged = !isEqual(brokers, prevBrokersRef.current);
        const updatesChanged = !isEqual(brokerUpdates, prevUpdatesRef.current);
        const chipsChanged = !isEqual(currentChips, prevChipsRef.current);

        console.group('🔄 Change Detection');
        if (brokersChanged) logData(brokersChanged, 'brokersChanged');
        if (updatesChanged) logData(updatesChanged, 'updatesChanged');
        if (chipsChanged) logData(chipsChanged, 'chipsChanged');

        if (!brokersChanged && !updatesChanged && !chipsChanged) {
            console.log('⏭️ No changes detected, skipping update');
            console.groupEnd();
            return;
        }

        if (brokersChanged || updatesChanged || chipsChanged) {
            if (brokersChanged) {
                logIfData( prevBrokersRef.current, 'Previous:');
                logIfData(brokers, 'Current:');
            }
            if (updatesChanged) {
                logIfData(prevUpdatesRef.current, 'Previous:');
                logIfData(brokerUpdates, 'Current:');
            }
            if (chipsChanged) {
                logIfData(prevChipsRef.current, 'Previous:');
                logIfData(currentChips, 'Current:');
            }
        }

        prevBrokersRef.current = brokers;
        prevUpdatesRef.current = brokerUpdates;
        prevChipsRef.current = currentChips;

        Object.entries(brokers).forEach(([brokerId, brokerData]) => {
            console.group(`🎯 Broker: ${brokerData.name || brokerId}`);

            const matchingChips = currentChips.filter(chip => chip.brokerId === brokerId);
            logIfData(matchingChips.length, 'matchingChips');
            logIfData(matchingChips, 'matchingChips');

            if (!matchingChips.length) {
                console.groupEnd();
                return;
            }

            const unsavedData = brokerUpdates[brokerId];
            const mergedBrokerData = {
                ...brokerData,
                ...(unsavedData || {})
            };

            console.group('Broker Data');
            logIfData(brokerData, 'Original:');
            logIfData(unsavedData, 'Unsaved:');
            logIfData(mergedBrokerData, 'Merged:');
            console.groupEnd();

            matchingChips.forEach(chip => {
                const newLabel = mergedBrokerData.name || '';
                const newValue = mergedBrokerData.defaultValue || '';

                const labelChanged = chip.label !== newLabel;
                const valueChanged = chip.stringValue !== newValue;

                if (labelChanged || valueChanged) {
                    console.group(`Chip Update: ${chip.id}`);
                    logIfData({
                        label: {
                            from: chip.label,
                            to: newLabel,
                            changed: labelChanged
                        },
                        value: {
                            from: chip.stringValue,
                            to: newValue,
                            changed: valueChanged
                        }
                    },'Changes');

                    setEditors(current => {
                        const next = new Map(current);

                        for (const [editorId, state] of next) {
                            const chipIndex = state.chipData.findIndex(c => c.id === chip.id);
                            if (chipIndex !== -1) {
                                const newChipData = [...state.chipData];
                                newChipData[chipIndex] = {
                                    ...newChipData[chipIndex],
                                    label: newLabel,
                                    stringValue: newValue
                                };
                                next.set(editorId, { ...state, chipData: newChipData });
                                console.log('✅ Updated in Editor:', editorId);
                                break;
                            }
                        }

                        return next;
                    });
                    console.groupEnd();
                }
            });
            console.groupEnd();
        });
        console.groupEnd();
    }, [brokers, brokerUpdates, editors, setEditors]);
};

export default useBrokerSync;
