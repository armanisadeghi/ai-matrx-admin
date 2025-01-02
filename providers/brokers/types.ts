// Define the possible data types
export type BrokerDataType = "str" | "bool" | "dict" | "float" | "int" | "list" | "url";

// Map data types to their TypeScript equivalents
export type DataTypeToValueType<T extends BrokerDataType> = {
    "str": string;
    "bool": boolean;
    "dict": Record<string, unknown>;
    "float": number;
    "int": number;
    "list": unknown[];
    "url": string;
}[T];

// Base BrokerData type
export type BrokerData = {
    id: string;
    name: string;
    dataType: BrokerDataType;
} & {
    tags?: Record<string, unknown>;
    description?: string;
    ready?: boolean;
    defaultSource?: "function" | "api" | "chance" | "database" | "environment" | "file" | "generated_data" | "none" | "user_input";
    displayName?: string;
    tooltip?: string;
    validationRules?: Record<string, unknown>;
    sampleEntries?: string;
    customSourceComponent?: string;
    additionalParams?: Record<string, unknown>;
    otherSourceParams?: Record<string, unknown>;
    defaultDestination?: "function" | "database" | "file" | "api_response" | "user_output";
    outputComponent?: string;
};

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