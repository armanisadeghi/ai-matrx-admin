import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux/store';
import { SocketConnectionManager, PredefinedConnection } from '../connection/socketConnectionManager';

export type socketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SocketConnection {
  id: string;
  socket: any | null;
  url: string;
  namespace: string;
  connectionStatus: socketConnectionStatus;
  isAuthenticated: boolean;
}

export interface ConnectionForm {
  url: string;
  namespace: string;
  selectedPredefined: string;
}

interface SocketState {
  connections: Record<string, SocketConnection>;
  primaryConnectionId: string;
  authToken: string | null;
  isAdmin: boolean;
  predefinedConnections: PredefinedConnection[];
  connectionForm: ConnectionForm;
}

const initialState: SocketState = {
  connections: {
    primary: {
      id: 'primary',
      socket: null,
      url: SocketConnectionManager.DEFAULT_URL,
      namespace: SocketConnectionManager.DEFAULT_NAMESPACE,
      connectionStatus: 'disconnected',
      isAuthenticated: false,
    },
  },
  primaryConnectionId: 'primary',
  authToken: null,
  isAdmin: false,
  predefinedConnections: SocketConnectionManager.getPredefinedConnections(),
  connectionForm: {
    url: '',
    namespace: SocketConnectionManager.DEFAULT_NAMESPACE,
    selectedPredefined: '',
  },
};

const socketConnectionsSlice = createSlice({
  name: 'socketConnections',
  initialState,
  reducers: {
    setConnection: (state, action: PayloadAction<SocketConnection>) => {
      state.connections[action.payload.id] = action.payload;
    },
    removeConnection: (state, action: PayloadAction<string>) => {
      if (action.payload !== state.primaryConnectionId) {
        delete state.connections[action.payload];
      }
    },
    setPrimaryConnection: (state, action: PayloadAction<string>) => {
      if (state.connections[action.payload]) {
        state.primaryConnectionId = action.payload;
      }
    },
    setSocket: (state, action: PayloadAction<{ connectionId: string; socket: any }>) => {
      const conn = state.connections[action.payload.connectionId];
      if (conn) {
        conn.socket = action.payload.socket;
      }
    },
    setConnectionStatus: (
      state,
      action: PayloadAction<{
        connectionId: string;
        status: socketConnectionStatus;
      }>
    ) => {
      const conn = state.connections[action.payload.connectionId];
      if (conn) {
        conn.connectionStatus = action.payload.status;
      }
    },
    setAuthToken: (state, action: PayloadAction<string | null>) => {
      state.authToken = action.payload;
    },
    setIsAdmin: (state, action: PayloadAction<boolean>) => {
      state.isAdmin = action.payload;
    },
    setIsAuthenticated: (
      state,
      action: PayloadAction<{ connectionId: string; isAuthenticated: boolean }>
    ) => {
      const conn = state.connections[action.payload.connectionId];
      if (conn) {
        conn.isAuthenticated = action.payload.isAuthenticated;
      }
    },
    changeConnectionUrl: (state, action: PayloadAction<{ connectionId: string; url: string }>) => {},
    changeNamespace: (
      state,
      action: PayloadAction<{ connectionId: string; namespace: string }>
    ) => {},
    disconnectConnection: (state, action: PayloadAction<string>) => {
      const conn = state.connections[action.payload];
      if (conn) {
        conn.connectionStatus = 'disconnected';
        conn.socket = null;
        conn.isAuthenticated = false;
      }
    },
    reconnectConnection: (state, action: PayloadAction<string>) => {
      // The actual reconnection happens in the middleware/saga/thunk,
      // here we just update the status to connecting
      const conn = state.connections[action.payload];
      if (conn) {
        conn.connectionStatus = 'connecting';
      }
    },
    deleteConnection: (state, action: PayloadAction<string>) => {
      // Don't allow deleting the primary connection
      if (action.payload !== state.primaryConnectionId) {
        delete state.connections[action.payload];
      }
    },
    addConnection: (
      state,
      action: PayloadAction<{ id: string; url: string; namespace: string }>
    ) => {
      const { id, url, namespace } = action.payload;
      state.connections[id] = {
        id,
        socket: null,
        url,
        namespace,
        connectionStatus: 'disconnected',
        isAuthenticated: false,
      };
      // Reset form after adding
      state.connectionForm = {
        url: '',
        namespace: SocketConnectionManager.DEFAULT_NAMESPACE,
        selectedPredefined: '',
      };
    },
    // New form actions
    updateFormUrl: (state, action: PayloadAction<string>) => {
      state.connectionForm.url = action.payload;
    },
    updateFormNamespace: (state, action: PayloadAction<string>) => {
      state.connectionForm.namespace = action.payload;
    },
    selectPredefinedConnection: (state, action: PayloadAction<string>) => {
      state.connectionForm.selectedPredefined = action.payload;
      
      // If it's a custom value, just clear the URL
      if (action.payload === 'custom') {
        state.connectionForm.url = '';
        state.connectionForm.namespace = SocketConnectionManager.DEFAULT_NAMESPACE;
        return;
      }
      
      // Otherwise find the matching predefined connection
      const predefined = state.predefinedConnections.find(
        conn => conn.name === action.payload
      );
      
      if (predefined) {
        state.connectionForm.url = predefined.url;
        state.connectionForm.namespace = predefined.namespace;
      }
    },
  },
});

export const {
  setConnection,
  removeConnection,
  setPrimaryConnection,
  setSocket,
  setConnectionStatus,
  setAuthToken,
  setIsAdmin,
  setIsAuthenticated,
  changeConnectionUrl,
  changeNamespace,
  disconnectConnection,
  reconnectConnection,
  deleteConnection,
  addConnection,
  updateFormUrl,
  updateFormNamespace,
  selectPredefinedConnection,
} = socketConnectionsSlice.actions;

// Selectors
export const selectConnectionById = (state: RootState, connectionId: string) =>
  state.socketConnections.connections[connectionId];
export const selectPrimaryConnectionId = (state: RootState) =>
  state.socketConnections.primaryConnectionId;
export const selectPrimaryConnection = (state: RootState) =>
  state.socketConnections.connections[state.socketConnections.primaryConnectionId];
export const selectAuthToken = (state: RootState) => state.socketConnections.authToken;
export const selectIsAdmin = (state: RootState) => state.socketConnections.isAdmin;
export const selectAllConnections = (state: RootState) =>
  Object.values(state.socketConnections.connections);
export const selectPredefinedConnections = (state: RootState) =>
  state.socketConnections.predefinedConnections;
export const selectConnectionForm = (state: RootState) =>
  state.socketConnections.connectionForm;

export default socketConnectionsSlice.reducer;