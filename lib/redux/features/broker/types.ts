// redux/features/broker/types.ts
export interface Broker {
    id: string;
    officialName: string;
    dataType: string;
    displayName: string;
    description?: string;
    componentType?: string;
    additionalParams?: Record<string, any>;
    validationRules?: Record<string, any>;
    tooltip?: string;
    sampleEntries?: string[];
    defaultValue?: any;
    [key: string]: any; // Allow for additional properties
}

export interface BrokerInstance extends Broker {
    value: any;
    ready: boolean;
}

// Keep BrokerValue unchanged as it's required by the backend
export interface BrokerValue {
    id: string;
    name: string;
    value: any;
    official_name: string;
    data_type: string;
    ready: boolean | null;
}
