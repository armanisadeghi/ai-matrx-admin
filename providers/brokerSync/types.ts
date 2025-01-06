// providers/brokerSync/types.ts

import { EditorBroker } from "@/components/matrx-editor-advanced/types";

// Constants

// Core Types
export type BrokerDataType = 'str' | 'bool' | 'dict' | 'float' | 'int' | 'list' | 'url';
export type ConnectionStatus = 'active' | 'modified' | 'pending' | 'unlinked';

// Instance and Connection Types
export interface BrokerInstance {
    blockId: string;
    editorId: string;
    content?: string;
    status?: ConnectionStatus;
}

export interface BrokerConnection {
    brokerId: string;
    editorId: string;
    blockIds: string[];
    color: string;
    isTemporary?: boolean;
    status?: ConnectionStatus;
}

export interface EditorInstance {
    id: string;
    brokers: Set<string>;
    ref: React.RefObject<HTMLDivElement>;
}

// State Types
export interface BrokerSyncState {
    trackedBrokers: Map<string, TrackedBroker>;
    orphanedInstances: Map<string, BrokerInstance>;
    colorAssignments: Map<string, string>;
}

export interface TrackedBroker {
    id: string;
    displayName: string;
    instances: BrokerInstance[];
    color: string;
    isTemporary: boolean;
    originalContent?: string;
}

// Actions
export type BrokerSyncAction =
    // Broker tracking
    // Existing actions
    | { type: 'TRACK_BROKER'; payload: { 
        id: string; 
        displayName: string;
        stringValue: string;
        editorId: string;
        isConnected: boolean;
        progressStep: 'tempRequested';
        color: string;
    }}
    | { type: 'UNTRACK_BROKER'; payload: string }
    | { type: 'UPDATE_BROKER_NAME'; payload: { id: string; displayName: string }}
    | { type: 'UPDATE_BROKER_PROGRESS'; payload: { 
        id: string; 
        progressStep: EditorBroker['progressStep'] 
    }}
    | { type: 'UPDATE_BROKER_CONNECTION'; payload: { 
        id: string; 
        isConnected: boolean 
    }}
    | { type: 'ADD_BROKER_INSTANCE'; payload: { 
        brokerId: string; 
        instance: BrokerInstance 
    }}
    | { type: 'REMOVE_BROKER_INSTANCE'; payload: { 
        brokerId: string; 
        editorId: string 
    }}
    | { type: 'UNLINK_BROKER'; payload: { 
        brokerId: string; 
        editorId: string 
    }}    
    // Orphaned instance management
    | { type: 'ADD_ORPHANED_INSTANCE'; payload: { blockId: string; editorId: string; content?: string; originalBrokerId?: string } }
    | { type: 'UPDATE_ORPHANED_CONTENT'; payload: { blockId: string; content: string } }
    
    // Instance movement
    | { type: 'MOVE_INSTANCE'; payload: { blockId: string; fromOrphaned?: boolean; fromBrokerId?: string; toBrokerId: string } }
    
    // Content updates
    | { type: 'UPDATE_INSTANCE_CONTENT'; payload: { brokerId: string; blockId: string; content: string } }
    
    // Editor management
    | { type: 'REGISTER_EDITOR'; payload: { id: string; ref: React.RefObject<HTMLDivElement> } }
    | { type: 'UNREGISTER_EDITOR'; payload: string };
    
    
    // Context Value Type
export interface BrokerSyncContextValue {
    initializeBroker: (editorId: string, displayName: string, stringValue: string) => Promise<string>;
    addBrokerInstance: (brokerId: string, editorId: string, blockId: string, stringValue?: string) => void;
    updateBrokerName: (brokerId: string, displayName: string) => void;
    unlinkBroker: (brokerId: string, editorId: string) => void;
    removeBroker: (brokerId: string, editorId: string) => void;
    handleOrphanedInstance: (blockId: string, action: 'create-new' | 'connect-existing', targetBrokerId?: string) => Promise<void>;
    changeBrokerRelationship: (sourceBlockId: string, targetBrokerId: string, shouldMergeContent?: boolean) => Promise<void>;
    handleEditorRegistration: (editorId: string, editorRef: React.RefObject<HTMLDivElement>) => void;
    handleEditorCleanup: (editorId: string) => void;
    trackContentUpdate: (blockId: string, stringValue: string, editorId: string) => Promise<void>;
    getBrokerInstances: (brokerId: string) => BrokerInstance[];
    getOrphanedInstances: () => [string, BrokerInstance][];
    getBrokerColor: (brokerId: string) => string | undefined;
}

// Base BrokerData type (for Redux/Entity system)
export interface BrokerData {
    id: string;
    name: string;
    dataType: BrokerDataType;
    stringValue?: string;
    value?: Record<string, unknown> | null;
    displayName?: string;
    description?: string;
    ready?: boolean;
    defaultSource?: 'function' | 'api' | 'chance' | 'database' | 'environment' | 'file' | 'generated_data' | 'none' | 'user_input';
    defaultDestination?: 'function' | 'database' | 'file' | 'api_response' | 'user_output';
    // Optional metadata
    tooltip?: string;
    validationRules?: Record<string, unknown>;
    sampleEntries?: string;
    customSourceComponent?: string;
    additionalParams?: Record<string, unknown>;
    otherSourceParams?: Record<string, unknown>;
    outputComponent?: string;
}

// Type Guards
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