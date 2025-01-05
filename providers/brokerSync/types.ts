import { InitialTableSchema } from '@/utils/schema/initialSchemas';
import { v4 as uuidv4 } from 'uuid';

// Constants for color management
export const TAILWIND_COLORS = ['blue', 'green', 'yellow', 'red', 'purple', 'pink', 'indigo', 'teal'] as const;

// Connection status to track broker state
export type ConnectionStatus = 'active' | 'modified' | 'pending' | 'unlinked';

export interface BrokerConnection {
    brokerId: string;
    editorId: string;
    blockIds: string[]; // Multiple blocks can reference the same broker
    color: string;
    isTemporary: boolean;
    pendingContent?: string; // Content waiting to be saved
    status: ConnectionStatus; // Add status field
}

export interface SyncState {
    connections: BrokerConnection[];
    unlinkedBlocks: UnlinkedBlock[];
    activeEditors: Set<string>;
}

export interface EditorInstance {
    id: string;
    brokers: Set<string>;
    ref: React.RefObject<HTMLDivElement>;
}

// Types
export interface BrokerSyncState {
    connections: BrokerConnection[];
    unlinkedBlocks: UnlinkedBlock[];
    editorInstances: Map<string, EditorInstance>;
}

export interface UnlinkedBlock {
    blockId: string;
    editorId: string;
    content: string;
    status?: ConnectionStatus; // Optional status for unlinked blocks
}

// Define the possible data types
export type BrokerDataType = 'str' | 'bool' | 'dict' | 'float' | 'int' | 'list' | 'url';

// Map data types to their TypeScript equivalents
export type DataTypeToValueType<T extends BrokerDataType> = {
    str: string;
    bool: boolean;
    dict: Record<string, unknown>;
    float: number;
    int: number;
    list: unknown[];
    url: string;
}[T];

// Base BrokerData type
export type BrokerData = {
    id: string;
    name: string;
    dataType: BrokerDataType;
    stringValue?: string; // Add stringValue for text representation
    value?: Record<string, unknown> | null; // Make value optional and nullable
    description?: string;
    ready?: boolean;
    displayName?: string;
    defaultSource?: 'function' | 'api' | 'chance' | 'database' | 'environment' | 'file' | 'generated_data' | 'none' | 'user_input';
    tooltip?: string;
    validationRules?: Record<string, unknown>;
    sampleEntries?: string;
    customSourceComponent?: string;
    additionalParams?: Record<string, unknown>;
    otherSourceParams?: Record<string, unknown>;
    defaultDestination?: 'function' | 'database' | 'file' | 'api_response' | 'user_output';
    outputComponent?: string;
};

// Type guard for BrokerData
export function isBrokerData(obj: unknown): obj is BrokerData {
    if (!obj || typeof obj !== 'object') return false;
    const broker = obj as BrokerData;
    return (
        typeof broker.id === 'string' &&
        typeof broker.name === 'string' &&
        typeof broker.dataType === 'string' &&
        ['str', 'bool', 'dict', 'float', 'int', 'list', 'url'].includes(broker.dataType)
    );
}