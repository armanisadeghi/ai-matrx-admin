import { useEffect, useCallback } from 'react';
import { useAppSelector } from '@/lib/redux';
import { MatrxRecordId } from '@/types';
import { useEditorContext } from '../EditorProvider';
import { ChipData } from '../../types/editor.types';

export const useBrokerChipSync = () => {
    const context = useEditorContext();
    
    // Subscribe to broker changes in Redux
    const brokers = useAppSelector(state => state.entities.dataBroker.records);
    const brokerUpdates = useAppSelector(state => state.entities.dataBroker.unsavedRecords);
    
    // Update all chips connected to a broker
    const syncBrokerToChips = useCallback((brokerId: MatrxRecordId, brokerData: any) => {
        // Get all chips connected to this broker across all editors
        const connectedEditors = context.getChipsForBroker(brokerId);
        
        connectedEditors.forEach(({ editorId, chips }) => {
            chips.forEach(chip => {
                // Map broker data to chip updates
                const chipUpdates: Partial<ChipData> = {
                    label: brokerData.name,
                    stringValue: brokerData.defaultValue,
                    // Add any other fields that should sync from broker to chip
                };
                
                // Update the chip
                context.updateChipData(editorId, chip.id, chipUpdates);
            });
        });
    }, [context]);

    // Listen for broker changes
    useEffect(() => {
        Object.entries(brokers).forEach(([brokerId, brokerData]) => {
            const lastUpdate = brokerUpdates[brokerId];
            if (lastUpdate) {
                console.log('Syncing broker changes:', {
                    brokerId,
                    brokerData,
                    lastUpdate
                });
                syncBrokerToChips(brokerId, brokerData);
            }
        });
    }, [brokers, brokerUpdates, syncBrokerToChips]);

    return {
        syncBrokerToChips
    };
};
