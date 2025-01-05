// useBrokerValue.ts
import { BrokerData, MatrxRecordId } from '@/types';
import { useCallback } from 'react';
import { useEntityTools } from '@/lib/redux';
import { useUpdateFields } from '@/app/entities/hooks/crud/useUpdateFields';

type BrokerDataType = "str" | "bool" | "dict" | "float" | "int" | "list" | "url";

interface BrokerValue {
    broker_value: unknown;
}


interface UseBrokerResult {
    updateBrokerValue: (recordId: MatrxRecordId, stringValue: string, dataType?: BrokerDataType) => void;
    updateBrokerData: (recordId: MatrxRecordId, value: unknown, dataType?: BrokerDataType) => void;
    syncBrokerValues: (recordId: MatrxRecordId) => void;
}

export const useBrokerValue = (): UseBrokerResult => {
    const { updateFields } = useUpdateFields('broker');
    const { selectors, store } = useEntityTools('broker');

    const convertToString = (value: unknown, dataType: BrokerDataType): string => {
        switch (dataType) {
            case 'bool':
                return String(value);
            case 'float':
            case 'int':
                return String(value);
            case 'list':
            case 'dict':
                return JSON.stringify(value, null, 2);
            case 'url':
            case 'str':
            default:
                return String(value);
        }
    };

    const convertFromString = (stringValue: string, dataType: BrokerDataType): unknown => {
        try {
            switch (dataType) {
                case 'bool':
                    return stringValue.toLowerCase() === 'true';
                case 'float':
                    return parseFloat(stringValue);
                case 'int':
                    return parseInt(stringValue, 10);
                case 'list':
                case 'dict':
                    return JSON.parse(stringValue);
                case 'url':
                    // Could add URL validation here
                    return stringValue;
                case 'str':
                default:
                    return stringValue;
            }
        } catch (error) {
            console.warn(`Conversion failed for type ${dataType}, using string instead`);
            return stringValue;
        }
    };

    // Update from string value
    const updateBrokerValue = useCallback((
        recordId: MatrxRecordId, 
        stringValue: string,
        dataType: BrokerDataType = 'str'
    ) => {
        const convertedValue = convertFromString(stringValue, dataType);
        
        updateFields(recordId, {
            value: { broker_value: convertedValue },
            dataType,
            stringValue
        });
    }, [updateFields]);

    // Update from actual value
    const updateBrokerData = useCallback((
        recordId: MatrxRecordId,
        value: unknown,
        dataType: BrokerDataType = 'str'
    ) => {
        const stringValue = convertToString(value, dataType);

        updateFields(recordId, {
            value: { broker_value: value },
            dataType,
            stringValue
        });
    }, [updateFields]);

    // Sync values if they get out of sync
    const syncBrokerValues = useCallback((recordId: MatrxRecordId) => {
        const state = store.getState();
        const broker = selectors.selectRecordByKey(state, recordId) as BrokerData | undefined;
        
        if (broker) {
            const { value, stringValue, dataType } = broker;
            const brokerValue = value?.broker_value;

            if (brokerValue !== undefined) {
                // Sync from value to stringValue
                const newStringValue = convertToString(brokerValue, dataType);
                if (newStringValue !== stringValue) {
                    updateFields(recordId, { stringValue: newStringValue });
                }
            } else if (stringValue) {
                // Sync from stringValue to value
                const newValue = convertFromString(stringValue, dataType);
                updateFields(recordId, {
                    value: { broker_value: newValue }
                });
            }
        }
    }, [selectors, store, updateFields]);

    return { updateBrokerValue, updateBrokerData, syncBrokerValues };
};