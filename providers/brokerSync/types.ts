import { v4 as uuidv4 } from 'uuid';


// Constants for color management
export const TAILWIND_COLORS = [
  'blue',
  'green',
  'yellow',
  'red',
  'purple',
  'pink',
  'indigo',
  'teal',
] as const;

export interface BrokerConnection {
  brokerId: string;
  editorId: string;
  blockIds: string[]; // Multiple blocks can reference the same broker
  color: string;
  isTemporary: boolean;
  pendingContent?: string; // Content waiting to be saved
}

export interface SyncState {
  connections: BrokerConnection[];
  unlinkedBlocks: {
    blockId: string;
    editorId: string;
    content: string;
  }[];
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
  }
  
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
