import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SocketConnectionManager } from '../connection/socketConnectionManager';
import { socketConnectionStatus, SocketState } from '../socket.types';
import { SocketConnection } from '../socket.types';

// Extend SocketState to include testMode
interface ExtendedSocketState extends SocketState {
  testMode: boolean;
}

const initialState: ExtendedSocketState = {
  connections: {
    primary: {
      connectionId: 'primary',
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
  testMode: false, // Add testMode to initial state
};

const socketConnectionsSlice = createSlice({
  name: 'socketConnections',
  initialState,
  reducers: {
    setConnection: (state, action: PayloadAction<SocketConnection>) => {
      state.connections[action.payload.connectionId] = action.payload;
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
      const conn = state.connections[action.payload];
      if (conn) {
        conn.connectionStatus = 'connecting';
      }
    },
    deleteConnection: (state, action: PayloadAction<string>) => {
      if (action.payload !== state.primaryConnectionId) {
        delete state.connections[action.payload];
      }
    },
    addConnection: (
      state,
      action: PayloadAction<{ connectionId: string; url: string; namespace: string }>
    ) => {
      const { connectionId, url, namespace } = action.payload;
      state.connections[connectionId] = {
        connectionId,
        socket: null,
        url,
        namespace,
        connectionStatus: 'disconnected',
        isAuthenticated: false,
      };
      state.connectionForm = {
        url: '',
        namespace: SocketConnectionManager.DEFAULT_NAMESPACE,
        selectedPredefined: '',
      };
    },
    updateFormUrl: (state, action: PayloadAction<string>) => {
      state.connectionForm.url = action.payload;
    },
    updateFormNamespace: (state, action: PayloadAction<string>) => {
      state.connectionForm.namespace = action.payload;
    },
    selectPredefinedConnection: (state, action: PayloadAction<string>) => {
      state.connectionForm.selectedPredefined = action.payload;
      
      if (action.payload === 'custom') {
        state.connectionForm.url = '';
        state.connectionForm.namespace = SocketConnectionManager.DEFAULT_NAMESPACE;
        return;
      }
      
      const predefined = state.predefinedConnections.find(
        conn => conn.name === action.payload
      );
      
      if (predefined) {
        state.connectionForm.url = predefined.url;
        state.connectionForm.namespace = predefined.namespace;
      }
    },
    // Add toggleTestMode action
    toggleTestMode: (state) => {
      state.testMode = !state.testMode;
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
  toggleTestMode,
} = socketConnectionsSlice.actions;


export default socketConnectionsSlice.reducer;