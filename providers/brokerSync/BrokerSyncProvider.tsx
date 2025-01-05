import React, { createContext, useContext, useReducer, useRef, useCallback, useMemo } from 'react';
import { useEntityTools } from '@/lib/redux';
import { v4 as uuidv4 } from 'uuid';
import { BrokerConnection, BrokerDataType, BrokerSyncState, EditorInstance, TAILWIND_COLORS, UnlinkedBlock } from './types';
import { BrokerChipEvent } from '@/components/matrx-editor/types';
import { BrokerData, EntityKeys, MatrxRecordId } from '@/types';
import { useEntitySelectionCrud } from '@/app/entities/hooks/crud/useCrudById';
import { useQuickRef } from '@/app/entities/hooks/useQuickRef';
import { useUpdateFields } from '@/app/entities/hooks/crud/useUpdateFields';
import { useCreateRecord } from '@/app/entities/hooks/crud/useCreateRecord';
import { useBrokerValue } from '@/components/matrx-editor-advanced/broker/useBrokerValue';
import { generateBrokerName } from '@/components/matrx-editor-advanced/utils/generateBrokerName';
import { EditorBroker } from '@/components/matrx-editor-advanced/types';

const entityName = 'broker' as EntityKeys;

// Context
interface BrokerSyncContextValue {
    state: BrokerSyncState;
    brokerData: {
        selectedBrokers: Record<string, BrokerData>;
        selectedIds: string[];
        isLoading: boolean;
        hasUnsavedChanges: boolean;
    };
    registerEditor: (editor: EditorInstance) => void;
    unregisterEditor: (editorId: string) => void;
    handleTextToBroker: (text: string, editorId: string, existingBrokerId?: string) => Promise<string>;
    handleChipEvent: (event: BrokerChipEvent, editorId: string) => void;
    handleUnlinkedBlock: (blockId: string, editorId: string, content: string) => void;
    linkBlockToBroker: (blockId: string, brokerId: string, editorId: string) => void;
    getConnectionStatus: (brokerId: string) => {
        isConnected: boolean;
        connectedEditors: string[];
        color: string | undefined;
    };
    extractBrokerFromNode: (node: HTMLElement) => Partial<EditorBroker> | null;
    findBrokerNodesInEditor: (editorId: string) => HTMLElement[];
    
}

const BrokerSyncContext = createContext<BrokerSyncContextValue | null>(null);

// Provider Component
export const BrokerSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { actions, dispatch, selectors } = useEntityTools(entityName);
    const { selectedRecordsOrDefaultsWithKeys, selectedRecordIds, isLoading, hasUnsavedChanges, startCreateMode } = useEntitySelectionCrud(entityName);
    const { handleAddToSelection } = useQuickRef(entityName);
    const { updateFields } = useUpdateFields(entityName);
    const { createRecord } = useCreateRecord(entityName);
    const { updateBrokerValue } = useBrokerValue();

    // Local state management
    const [state, syncDispatch] = useReducer(brokerSyncReducer, {
        connections: [],
        unlinkedBlocks: [],
        editorInstances: new Map(),
    });

    const usedColors = useRef(new Set<string>());

    const getNextColor = useCallback(() => {
        const availableColors = TAILWIND_COLORS.filter((color) => !usedColors.current.has(color));
        const selectedColor = availableColors[0] || TAILWIND_COLORS[0];
        usedColors.current.add(selectedColor);
        return selectedColor;
    }, []);

    // Memoized broker data with proper typing
    const brokerData = useMemo(
        () => ({
            selectedBrokers: selectedRecordsOrDefaultsWithKeys as unknown as Record<string, BrokerData>,
            selectedIds: selectedRecordIds,
            isLoading,
            hasUnsavedChanges,
        }),
        [selectedRecordsOrDefaultsWithKeys, selectedRecordIds, isLoading, hasUnsavedChanges]
    );

    // Editor registration
    const registerEditor = useCallback((editor: EditorInstance) => {
        syncDispatch({ type: 'REGISTER_EDITOR', payload: editor });
    }, []);

    const unregisterEditor = useCallback((editorId: string) => {
        syncDispatch({ type: 'UNREGISTER_EDITOR', payload: editorId });
    }, []);

    // Main broker handling logic
    const handleTextToBroker = useCallback(
        async (text: string, editorId: string, existingBrokerId?: MatrxRecordId) => {
            // Generate new ID if not provided
            const brokerId = existingBrokerId || (uuidv4() as MatrxRecordId);
            const color = getNextColor();

            if (!existingBrokerId) {
                // Start create mode to prepare the entity system
                startCreateMode(1);

                // Update the broker fields
                updateFields(brokerId, {
                    name: generateBrokerName(text),
                    dataType: 'str',
                });

                // Update the broker value using specialized hook
                updateBrokerValue(brokerId, text);

                // Create the record in the entity system
                createRecord(brokerId);

                // Add to selections to ensure it's tracked
                handleAddToSelection(brokerId);
            }

            // Add or update connection in local state
            syncDispatch({
                type: 'ADD_CONNECTION',
                payload: {
                    brokerId,
                    editorId,
                    blockIds: [],
                    color,
                    isTemporary: !existingBrokerId,
                    pendingContent: text,
                    status: 'active',
                },
            });

            return brokerId;
        },
        [startCreateMode, updateFields, updateBrokerValue, createRecord, handleAddToSelection, getNextColor]
    );

    // Handle chip events
    const handleChipEvent = useCallback(
        async (event: BrokerChipEvent, editorId: string) => {
            switch (event.type) {
                case 'remove': {
                    // Remove connection but keep broker in system
                    syncDispatch({
                        type: 'REMOVE_CONNECTION',
                        payload: { brokerId: event.brokerId, editorId },
                    });
                    break;
                }
                case 'edit': {
                    if (event.content) {
                        // Update the broker value
                        updateBrokerValue(event.brokerId as MatrxRecordId, event.content);

                        // Update connection state to reflect new content
                        const connection = state.connections.find((conn) => conn.brokerId === event.brokerId && conn.editorId === editorId);
                        if (connection) {
                            syncDispatch({
                                type: 'UPDATE_CONNECTION',
                                payload: {
                                    ...connection,
                                    pendingContent: event.content,
                                    status: 'modified',
                                },
                            });
                        }
                    }
                    break;
                }
                case 'toggle': {
                    // Add to selections and ensure it's tracked
                    handleAddToSelection(event.brokerId as MatrxRecordId);
                    break;
                }
            }
        },
        [updateBrokerValue, handleAddToSelection, state.connections]
    );

    // Handle unlinked blocks
    const handleUnlinkedBlock = useCallback((blockId: string, editorId: string, content: string) => {
        syncDispatch({
            type: 'ADD_UNLINKED_BLOCK',
            payload: { blockId, editorId, content },
        });
    }, []);

    // Link blocks to brokers
    const linkBlockToBroker = useCallback(
        (blockId: string, brokerId: string, editorId: string) => {
            // Remove from unlinked blocks
            syncDispatch({ type: 'REMOVE_UNLINKED_BLOCK', payload: blockId });

            // Find existing connection
            const connection = state.connections.find((conn) => conn.brokerId === brokerId && conn.editorId === editorId);

            if (connection) {
                // Update existing connection
                syncDispatch({
                    type: 'UPDATE_CONNECTION',
                    payload: {
                        ...connection,
                        blockIds: [...connection.blockIds, blockId],
                        status: 'active',
                    },
                });
            } else {
                // Create new connection if none exists
                syncDispatch({
                    type: 'ADD_CONNECTION',
                    payload: {
                        brokerId,
                        editorId,
                        blockIds: [blockId],
                        color: getNextColor(),
                        isTemporary: false,
                        status: 'active',
                    },
                });
            }
        },
        [state.connections, getNextColor]
    );

    // New methods to add to our useBrokerSync hook
    const extractBrokerFromNode = (node: HTMLElement): Partial<EditorBroker> | null => {
        if (!node.hasAttribute('data-chip')) return null;

        return {
            id: node.getAttribute('data-id') || '',
            name: node.getAttribute('data-broker-name') || '',
            displayName: node.getAttribute('data-chip-content') || '',
            dataType: node.getAttribute('data-broker-datatype') as BrokerDataType,
            stringValue: node.getAttribute('data-original-text') || '',
            value: JSON.parse(node.getAttribute('data-value') || '{}'),
            editorId: node.getAttribute('data-editor-id') || undefined,
            isTemporary: node.hasAttribute('data-temporary'),
            color: node.getAttribute('data-color') || undefined,
        };
    };

    const findBrokerNodesInEditor = (editorId: string): HTMLElement[] => {
        const editor = document.querySelector(`[data-editor-id="${editorId}"]`);
        if (!editor) return [];

        return Array.from(editor.querySelectorAll('[data-chip]'));
    };
    // Get connection status
    const getConnectionStatus = useCallback(
        (brokerId: string) => {
            const relevantConnections = state.connections.filter((conn) => conn.brokerId === brokerId);
            return {
                isConnected: relevantConnections.length > 0,
                connectedEditors: relevantConnections.map((conn) => conn.editorId),
                color: relevantConnections[0]?.color,
            };
        },
        [state.connections]
    );

    const value: BrokerSyncContextValue = {
        state,
        brokerData,
        registerEditor,
        unregisterEditor,
        handleTextToBroker,
        handleChipEvent,
        handleUnlinkedBlock,
        linkBlockToBroker,
        getConnectionStatus,
        extractBrokerFromNode,
        findBrokerNodesInEditor,
    };

    return <BrokerSyncContext.Provider value={value}>{children}</BrokerSyncContext.Provider>;
};

// Hook for consuming the context
export const useBrokerSync = () => {
    const context = useContext(BrokerSyncContext);
    if (!context) {
        throw new Error('useBrokerSync must be used within a BrokerSyncProvider');
    }
    return context;
};

// Action types for the reducer
type BrokerSyncAction =
    | { type: 'REGISTER_EDITOR'; payload: EditorInstance }
    | { type: 'UNREGISTER_EDITOR'; payload: string }
    | { type: 'ADD_CONNECTION'; payload: BrokerConnection }
    | { type: 'REMOVE_CONNECTION'; payload: { brokerId: string; editorId: string } }
    | { type: 'UPDATE_CONNECTION'; payload: BrokerConnection }
    | { type: 'ADD_UNLINKED_BLOCK'; payload: UnlinkedBlock }
    | { type: 'REMOVE_UNLINKED_BLOCK'; payload: string };

// Reducer implementation
function brokerSyncReducer(state: BrokerSyncState, action: BrokerSyncAction): BrokerSyncState {
    switch (action.type) {
        case 'REGISTER_EDITOR':
            return {
                ...state,
                editorInstances: new Map(state.editorInstances).set(action.payload.id, action.payload),
            };

        case 'UNREGISTER_EDITOR': {
            const newInstances = new Map(state.editorInstances);
            newInstances.delete(action.payload);
            return {
                ...state,
                editorInstances: newInstances,
                connections: state.connections.filter((conn) => conn.editorId !== action.payload),
                unlinkedBlocks: state.unlinkedBlocks.filter((block) => block.editorId !== action.payload),
            };
        }

        case 'ADD_CONNECTION':
            return {
                ...state,
                connections: [...state.connections, action.payload],
            };

        case 'REMOVE_CONNECTION':
            return {
                ...state,
                connections: state.connections.filter((conn) => !(conn.brokerId === action.payload.brokerId && conn.editorId === action.payload.editorId)),
            };

        case 'UPDATE_CONNECTION':
            return {
                ...state,
                connections: state.connections.map((conn) =>
                    conn.brokerId === action.payload.brokerId && conn.editorId === action.payload.editorId ? action.payload : conn
                ),
            };

        case 'ADD_UNLINKED_BLOCK':
            return {
                ...state,
                unlinkedBlocks: [...state.unlinkedBlocks, action.payload],
            };

        case 'REMOVE_UNLINKED_BLOCK':
            return {
                ...state,
                unlinkedBlocks: state.unlinkedBlocks.filter((block) => block.blockId !== action.payload),
            };

        default:
            return state;
    }
}
