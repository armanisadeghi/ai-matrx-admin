// providers/brokerSync/types.ts

import { EditorBroker } from '@/components/matrx-editor-advanced/types';
import { MatrxRecordId } from '@/types';


// Core Types
export type BrokerDataType = 'str' | 'bool' | 'dict' | 'float' | 'int' | 'list' | 'url';
export type BrokerDefaultSource = 'function' | 'api' | 'chance' | 'database' | 'environment' | 'file' | 'generated_data' | 'none' | 'user_input';
export type BrokerDefaultDestination = 'function' | 'database' | 'file' | 'api_response' | 'user_output';

// Base BrokerData type (for Redux/Entity system)
export interface BrokerData {
    id: MatrxRecordId;
    displayName?: string;
    stringValue?: string;
    name?: string;
    dataType?: BrokerDataType;
    value?: Record<string, unknown> | null;
    description?: string;
    ready?: boolean;
    defaultSource?: BrokerDefaultSource;
    defaultDestination?: BrokerDefaultDestination;
    tooltip?: string;
    validationRules?: Record<string, unknown>;
    sampleEntries?: string;
    customSourceComponent?: string;
    additionalParams?: Record<string, unknown>;
    otherSourceParams?: Record<string, unknown>;
    outputComponent?: string;
}

export interface EditorChip {
    editorId: string;
    brokerId?: string;
    displayName?: string;
    content?: string;
    blockId: string;
    color?: string;
}

export type ConnectionStatus = 'active' | 'modified' | 'pending' | 'unlinked';

export interface TrackedBroker extends BrokerData {
    isTemporary?: boolean;
    progressStep?: 'tempRequested' | 'tempConfirmed' | 'permanent' | 'error';
    color?: string;
    connectedChips?: EditorChip[];
}

export interface EditorInstance {
    id: string;
    ref: React.RefObject<HTMLDivElement>;
    chips: Set<string>;
    isFocused: boolean;
}


// Update BrokerSyncAction to include callback actions
export type BrokerSyncAction =
    // Broker tracking
    | {
          type: 'TRACK_BROKER';
          payload: {
              id: MatrxRecordId;
              displayName: string;
              stringValue?: string;
              editorId?: string;
              isTemporary: boolean;
              color: string;
          };
      }
    | { type: 'UNTRACK_BROKER'; payload: MatrxRecordId }
    | { type: 'UPDATE_BROKER_NAME'; payload: { id: MatrxRecordId; displayName: string } }
    | {
          type: 'UPDATE_BROKER_PROGRESS';
          payload: {
              id: MatrxRecordId;
              progressStep: TrackedBroker['progressStep'];
          };
      }
    | {
          type: 'UPDATE_BROKER_CONNECTION';
          payload: {
              id: MatrxRecordId;
              isConnected: boolean;
          };
      }
    // Instance management
    | {
          type: 'ADD_BROKER_INSTANCE';
          payload: {
              brokerId: MatrxRecordId;
              instance: BrokerInstance;
          };
      }
    | {
          type: 'REMOVE_BROKER_INSTANCE';
          payload: {
              brokerId: MatrxRecordId;
              editorId: string;
          };
      }
    // Orphaned instance management
    | {
          type: 'ADD_ORPHANED_INSTANCE';
          payload: {
              blockId: string;
              editorId: string;
              content?: string;
              originalBrokerId: string;
          };
      }
    | {
          type: 'UPDATE_ORPHANED_CONTENT';
          payload: {
              blockId: string;
              content: string;
          };
      }
    // Content updates
    | {
          type: 'UPDATE_INSTANCE_CONTENT';
          payload: {
              brokerId: string;
              blockId: string;
              content: string;
          };
      }
    // Callbacks
    | {
          type: 'REGISTER_CALLBACK';
          payload: {
              brokerId: string;
              callback: Function;
          };
      }
    | {
          type: 'UNREGISTER_CALLBACK';
          payload: {
              brokerId: string;
              callback: Function;
          };
      };
      // unlink broker
    | {
          type: 'UNLINK_BROKER';
          payload: {
              brokerId: MatrxRecordId;
              editorId: string;
          };
      };



// Context Value Type
export interface BrokerSyncContextValue {
    initializeBroker: (editorId: string, displayName: string, stringValue: string) => Promise<string>;
    addBrokerInstance: (brokerId: MatrxRecordId, editorId: string, blockId: string, stringValue?: string) => void;
    updateBrokerName: (brokerId: MatrxRecordId, displayName: string) => void;
    unlinkBroker: (brokerId: MatrxRecordId, editorId: string) => void;
    removeBroker: (brokerId: MatrxRecordId, editorId: string) => void;
    handleOrphanedInstance: (blockId: string, action: 'create-new' | 'connect-existing', targetBrokerId?: string) => Promise<void>;
    changeBrokerRelationship: (sourceBlockId: string, targetBrokerId: string, shouldMergeContent?: boolean) => Promise<void>;
    handleEditorRegistration: (editorId: string, editorRef: React.RefObject<HTMLDivElement>) => void;
    handleEditorCleanup: (editorId: string) => void;
    trackContentUpdate: (blockId: string, stringValue: string, editorId: string) => Promise<void>;
    getBrokerInstances: (brokerId: MatrxRecordId) => BrokerInstance[];
    getOrphanedInstances: () => [string, BrokerInstance][];
    getBrokerColor: (brokerId: MatrxRecordId) => string | undefined;
}


// Type Guards
export function isBrokerData(obj: unknown): obj is BrokerData {
    if (!obj || typeof obj !== 'object') return false;
    const broker = obj as BrokerData;
    return (
        typeof broker.id === 'string' &&
        typeof broker.displayName === 'string' &&
        typeof broker.dataType === 'string' &&
        ['str', 'bool', 'dict', 'float', 'int', 'list', 'url'].includes(broker.dataType)
    );
}
