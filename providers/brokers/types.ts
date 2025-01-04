import { BrokerData, DataTypeToValueType } from "../brokerSync/types";

// Broker interface that extends BrokerData with value type based on dataType
export interface Broker extends Omit<BrokerData, 'value'> {
    value: DataTypeToValueType<BrokerData['dataType']>;
    
    // Additional fields
    componentType: string;
    sourceDetails?: string;
    isConnected: boolean;
    isDeleted: boolean;
    color: {
        light: string;
        dark: string;
    };
}