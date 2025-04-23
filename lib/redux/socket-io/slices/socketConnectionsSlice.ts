import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type socketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';


export interface SocketConnection {
  id: string; // Unique identifier for the connection (e.g., 'primary', 'localhost', or dynamic UUID)
  socket: any | null; // Socket.io instance
  url: string; // Connection URL
  namespace: string; // Namespace (e.g., '/UserSession')
  connectionStatus: socketConnectionStatus;
  isAuthenticated: boolean; // Per-connection authentication status
}

interface SocketState {
  connections: Record<string, SocketConnection>; // Map of connection ID to connection details
  primaryConnectionId: string; // ID of the primary connection
  authToken: string | null; // Session-wide auth token
  isAdmin: boolean; // Session-wide admin status
}

const initialState: SocketState = {
  connections: {
    primary: {
      id: 'primary',
      socket: null,
      url: 'https://server.app.matrxserver.com',
      namespace: '/UserSession',
      connectionStatus: 'disconnected',
      isAuthenticated: false,
    },
  },
  primaryConnectionId: 'primary',
  authToken: null,
  isAdmin: false,
};

const socketConnectionsSlice = createSlice({
  name: 'socketConnections',
  initialState,
  reducers: {
    // Set or update a connection
    setConnection: (state, action: PayloadAction<SocketConnection>) => {
      state.connections[action.payload.id] = action.payload;
    },
    // Remove a connection
    removeConnection: (state, action: PayloadAction<string>) => {
      if (action.payload !== state.primaryConnectionId) {
        delete state.connections[action.payload];
      }
    },
    // Set primary connection
    setPrimaryConnection: (state, action: PayloadAction<string>) => {
      if (state.connections[action.payload]) {
        state.primaryConnectionId = action.payload;
      }
    },
    // Update socket for a connection
    setSocket: (state, action: PayloadAction<{ connectionId: string; socket: any }>) => {
      const conn = state.connections[action.payload.connectionId];
      if (conn) {
        conn.socket = action.payload.socket;
      }
    },
    // Update connection status
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
    // Set auth token (session-wide)
    setAuthToken: (state, action: PayloadAction<string | null>) => {
      state.authToken = action.payload;
    },
    // Set admin status (session-wide)
    setIsAdmin: (state, action: PayloadAction<boolean>) => {
      state.isAdmin = action.payload;
    },
    // Set authentication status for a connection
    setIsAuthenticated: (
      state,
      action: PayloadAction<{ connectionId: string; isAuthenticated: boolean }>
    ) => {
      const conn = state.connections[action.payload.connectionId];
      if (conn) {
        conn.isAuthenticated = action.payload.isAuthenticated;
      }
    },
    // Action to trigger URL change
    changeConnectionUrl: (state, action: PayloadAction<{ connectionId: string; url: string }>) => {},
    // Action to trigger namespace change
    changeNamespace: (
      state,
      action: PayloadAction<{ connectionId: string; namespace: string }>
    ) => {},
    // Action to disconnect a specific connection
    disconnectConnection: (state, action: PayloadAction<string>) => {},
    // Action to add a new connection
    addConnection: (
      state,
      action: PayloadAction<{ id: string; url: string; namespace: string }>
    ) => {},
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
  addConnection,
} = socketConnectionsSlice.actions;


export default socketConnectionsSlice.reducer;