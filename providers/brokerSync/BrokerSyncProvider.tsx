import React, { createContext, useContext, useReducer, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { BrokerConnection, BrokerSyncState, EditorInstance, TAILWIND_COLORS, UnlinkedBlock } from './types';
import { BrokerChipEvent } from '@/components/matrx-editor/types';


// Action types
type BrokerSyncAction =
  | { type: 'REGISTER_EDITOR'; payload: EditorInstance }
  | { type: 'UNREGISTER_EDITOR'; payload: string }
  | { type: 'ADD_CONNECTION'; payload: BrokerConnection }
  | { type: 'REMOVE_CONNECTION'; payload: { brokerId: string; editorId: string } }
  | { type: 'UPDATE_CONNECTION'; payload: BrokerConnection }
  | { type: 'ADD_UNLINKED_BLOCK'; payload: UnlinkedBlock }
  | { type: 'REMOVE_UNLINKED_BLOCK'; payload: string };

// Context
interface BrokerSyncContextValue {
  state: BrokerSyncState;
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
}

const BrokerSyncContext = createContext<BrokerSyncContextValue | null>(null);

// Reducer
function brokerSyncReducer(state: BrokerSyncState, action: BrokerSyncAction): BrokerSyncState {
  switch (action.type) {
    case 'REGISTER_EDITOR':
      return {
        ...state,
        editorInstances: new Map(state.editorInstances).set(action.payload.id, action.payload),
      };
    
    case 'UNREGISTER_EDITOR':
      const newInstances = new Map(state.editorInstances);
      newInstances.delete(action.payload);
      return {
        ...state,
        editorInstances: newInstances,
        connections: state.connections.filter(conn => conn.editorId !== action.payload),
        unlinkedBlocks: state.unlinkedBlocks.filter(block => block.editorId !== action.payload),
      };
    
    case 'ADD_CONNECTION':
      return {
        ...state,
        connections: [...state.connections, action.payload],
      };
    
    case 'REMOVE_CONNECTION':
      return {
        ...state,
        connections: state.connections.filter(
          conn => !(conn.brokerId === action.payload.brokerId && 
                   conn.editorId === action.payload.editorId)
        ),
      };
    
    case 'UPDATE_CONNECTION':
      return {
        ...state,
        connections: state.connections.map(conn =>
          conn.brokerId === action.payload.brokerId && 
          conn.editorId === action.payload.editorId
            ? action.payload
            : conn
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
        unlinkedBlocks: state.unlinkedBlocks.filter(block => block.blockId !== action.payload),
      };
    
    default:
      return state;
  }
}

// Provider Component
export const BrokerSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const [state, syncDispatch] = useReducer(brokerSyncReducer, {
    connections: [],
    unlinkedBlocks: [],
    editorInstances: new Map(),
  });
  
  const usedColors = useRef(new Set<string>());
  
  const getNextColor = useCallback(() => {
    const availableColors = TAILWIND_COLORS.filter(color => !usedColors.current.has(color));
    const selectedColor = availableColors[0] || TAILWIND_COLORS[0];
    usedColors.current.add(selectedColor);
    return selectedColor;
  }, []);

  const registerEditor = useCallback((editor: EditorInstance) => {
    syncDispatch({ type: 'REGISTER_EDITOR', payload: editor });
  }, []);

  const unregisterEditor = useCallback((editorId: string) => {
    syncDispatch({ type: 'UNREGISTER_EDITOR', payload: editorId });
  }, []);

  const handleTextToBroker = useCallback(async (
    text: string,
    editorId: string,
    existingBrokerId?: string
  ) => {
    const brokerId = existingBrokerId || uuidv4();
    const color = getNextColor();

    syncDispatch({
      type: 'ADD_CONNECTION',
      payload: {
        brokerId,
        editorId,
        blockIds: [],
        color,
        isTemporary: !existingBrokerId,
        pendingContent: text,
      },
    });

    if (!existingBrokerId) {
      dispatch({
        type: 'entitySlice/createTemporary',
        payload: {
          id: brokerId,
          defaultValues: {
            name: `New Broker ${brokerId.slice(0, 4)}`,
            dataType: 'str',
            value: text,
          },
        },
      });
    }

    return brokerId;
  }, [dispatch, getNextColor]);

  const handleChipEvent = useCallback((event: BrokerChipEvent, editorId: string) => {
    switch (event.type) {
      case 'remove':
        syncDispatch({
          type: 'REMOVE_CONNECTION',
          payload: { brokerId: event.brokerId, editorId },
        });
        break;
      
      case 'edit':
        if (event.content) {
          const connection = state.connections.find(
            conn => conn.brokerId === event.brokerId && conn.editorId === editorId
          );
          if (connection) {
            syncDispatch({
              type: 'UPDATE_CONNECTION',
              payload: { ...connection, pendingContent: event.content },
            });
          }
        }
        break;
      
      case 'toggle':
        dispatch({
          type: 'entitySlice/toggleSelection',
          payload: { id: event.brokerId },
        });
        break;
    }
  }, [dispatch, state.connections]);

  const value: BrokerSyncContextValue = {
    state,
    registerEditor,
    unregisterEditor,
    handleTextToBroker,
    handleChipEvent,
    handleUnlinkedBlock: useCallback((blockId: string, editorId: string, content: string) => {
      syncDispatch({
        type: 'ADD_UNLINKED_BLOCK',
        payload: { blockId, editorId, content },
      });
    }, []),
    linkBlockToBroker: useCallback((blockId: string, brokerId: string, editorId: string) => {
      syncDispatch({ type: 'REMOVE_UNLINKED_BLOCK', payload: blockId });
      
      const connection = state.connections.find(
        conn => conn.brokerId === brokerId && conn.editorId === editorId
      );
      
      if (connection) {
        syncDispatch({
          type: 'UPDATE_CONNECTION',
          payload: {
            ...connection,
            blockIds: [...connection.blockIds, blockId],
          },
        });
      }
    }, [state.connections]),
    getConnectionStatus: useCallback((brokerId: string) => {
      const relevantConnections = state.connections.filter(conn => conn.brokerId === brokerId);
      return {
        isConnected: relevantConnections.length > 0,
        connectedEditors: relevantConnections.map(conn => conn.editorId),
        color: relevantConnections[0]?.color,
      };
    }, [state.connections]),
  };

  return (
    <BrokerSyncContext.Provider value={value}>
      {children}
    </BrokerSyncContext.Provider>
  );
};

// Hook for consuming the context
export const useBrokerSync = () => {
  const context = useContext(BrokerSyncContext);
  if (!context) {
    throw new Error('useBrokerSync must be used within a BrokerSyncProvider');
  }
  return context;
};