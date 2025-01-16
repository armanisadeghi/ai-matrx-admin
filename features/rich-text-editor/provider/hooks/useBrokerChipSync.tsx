import { useEffect } from 'react';
import { useAppSelector } from '@/lib/redux';
import { DataBrokerData } from '@/types';
import { ChipData } from '../../types/editor.types';
import { useEditorContext } from '../EditorProvider';




const useBrokerChipSync = () => {
    const context = useEditorContext();
    const brokers = useAppSelector((state) => state.entities.dataBroker.records) as Record<string, DataBrokerData>;
    const brokerUpdates = useAppSelector((state) => state.entities.dataBroker.unsavedRecords) as Record<string, Partial<DataBrokerData>>;
    
    useEffect(() => {
        const interval = setInterval(() => {
            // Log all current chips first
            const allChips = context.getAllChipData();
            console.log('🔍 ALL CHIPS:', allChips);
            
            // Log all brokers
            console.log('📋 ALL BROKERS:', Object.keys(brokers).map(key => ({
                id: key,
                name: brokers[key].name
            })));

            Object.entries(brokers).forEach(([brokerKey, brokerData]) => {
                // Get all chips for this broker
                const matchingChips = context.getChipsForBroker(brokerKey);
                console.log('🎯 MATCHING CHECK:', {
                    brokerKey,
                    brokerName: brokerData.name,
                    matchCount: matchingChips?.length || 0,
                    matches: matchingChips
                });

                if (!matchingChips?.length) return;

                const unsavedData = brokerUpdates[brokerKey];

                // Merge broker data with unsaved changes
                const mergedData = { ...brokerData };
                if (unsavedData) {
                    Object.entries(unsavedData).forEach(([key, value]) => {
                        if (value !== null && value !== undefined && value !== '') {
                            mergedData[key] = value;
                        }
                    });
                }

                // Update all matching chips with the latest broker data
                matchingChips.forEach(chip => {
                    const updates: Partial<ChipData> = {
                        label: mergedData.name || '',
                        stringValue: mergedData.defaultValue || '',
                    };

                    context.updateChipData(chip.id, updates);
                });
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [context, brokers, brokerUpdates]);
};

export { useBrokerChipSync };
