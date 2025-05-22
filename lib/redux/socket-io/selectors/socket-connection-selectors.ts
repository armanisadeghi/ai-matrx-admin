// File Location: lib/redux/socket-io/selectors/socket-connection-selectors.ts
"use client";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux";

// ==================== Connection Selectors ====================

// Simple property access selectors
export const selectConnectionById = (state: RootState, connectionId: string) => 
  state.socketConnections.connections[connectionId] || null;

export const selectPrimaryConnectionId = (state: RootState) => 
  state.socketConnections.primaryConnectionId || "";

export const selectAuthToken = (state: RootState) => 
  state.socketConnections.authToken;

export const selectIsAdmin = (state: RootState) => 
  state.socketConnections.isAdmin;

export const selectPredefinedConnections = (state: RootState) => 
  state.socketConnections.predefinedConnections;

export const selectConnectionForm = (state: RootState) => 
  state.socketConnections.connectionForm;

export const selectConnectionTestMode = (state: RootState) => 
  state.socketConnections.testMode;

// Connection selectors with parameter and derived state
export const selectSocket = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.socket;
};

export const selectSocketUrl = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.url;
};

export const selectNamespace = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.namespace;
};

export const selectConnectionStatus = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.connectionStatus;
};

export const selectIsConnected = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.connectionStatus === "connected";
};

export const selectIsAuthenticated = (state: RootState, connectionId?: string) => {
  const effectiveConnectionId = connectionId || state.socketConnections.primaryConnectionId;
  return state.socketConnections.connections[effectiveConnectionId]?.isAuthenticated;
};

// New selectors for reconnection management
export const selectConnectionAttempts = (state: RootState, connectionId: string) => 
  state.socketConnections.connectionAttempts[connectionId] || 0;

export const selectConnectionError = (state: RootState, connectionId: string) => 
  state.socketConnections.lastConnectionError[connectionId] || null;

export const selectIsReconnecting = (state: RootState, connectionId: string) => 
  state.socketConnections.reconnectingConnections[connectionId] || false;

// Memoized connection selectors
export const selectPrimaryConnection = createSelector(
  (state: RootState) => state.socketConnections.connections,
  (state: RootState) => state.socketConnections.primaryConnectionId,
  (connections, primaryId) => connections[primaryId] || null
);

export const selectAllConnections = createSelector(
  (state: RootState) => state.socketConnections.connections,
  (connections) => Object.values(connections)
);

// New memoized selectors for connection health
export const selectConnectionHealth = createSelector(
  (state: RootState, connectionId: string) => selectConnectionById(state, connectionId),
  (state: RootState, connectionId: string) => selectConnectionAttempts(state, connectionId),
  (state: RootState, connectionId: string) => selectConnectionError(state, connectionId),
  (state: RootState, connectionId: string) => selectIsReconnecting(state, connectionId),
  (connection, attempts, error, isReconnecting) => ({
    connection,
    attempts,
    error,
    isReconnecting,
    isHealthy: connection?.connectionStatus === 'connected' && connection?.isAuthenticated && !error,
  })
);

export const selectAllConnectionsHealth = createSelector(
  selectAllConnections,
  (state: RootState) => state.socketConnections.connectionAttempts,
  (state: RootState) => state.socketConnections.lastConnectionError,
  (state: RootState) => state.socketConnections.reconnectingConnections,
  (connections, attempts, errors, reconnecting) => 
    connections.map(conn => ({
      ...conn,
      attempts: attempts[conn.connectionId] || 0,
      error: errors[conn.connectionId] || null,
      isReconnecting: reconnecting[conn.connectionId] || false,
      isHealthy: conn.connectionStatus === 'connected' && conn.isAuthenticated && !errors[conn.connectionId],
    }))
);

// Selector to check if any connection is reconnecting
export const selectAnyConnectionReconnecting = createSelector(
  (state: RootState) => state.socketConnections.reconnectingConnections,
  (reconnecting) => Object.values(reconnecting).some(isReconnecting => isReconnecting)
);

// Selector for active connections (connected and authenticated)
export const selectActiveConnections = createSelector(
  selectAllConnections,
  (connections) => connections.filter(conn => 
    conn.connectionStatus === 'connected' && conn.isAuthenticated
  )
);

// Selector for failed connections
export const selectFailedConnections = createSelector(
  selectAllConnections,
  (state: RootState) => state.socketConnections.lastConnectionError,
  (connections, errors) => connections.filter(conn => 
    conn.connectionStatus === 'error' || errors[conn.connectionId]
  )
);