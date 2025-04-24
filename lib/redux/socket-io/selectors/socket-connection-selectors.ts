// File Location: lib/redux/socket-io/selectors/socket-connection-selectors.ts

"use client";

import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux";

// ==================== Connection Selectors ====================
// Simple property access selectors
export const selectConnectionById = (state: RootState, connectionId: string) => state.socketConnections.connections[connectionId] || null;

export const selectPrimaryConnectionId = (state: RootState) => state.socketConnections.primaryConnectionId || "";

export const selectAuthToken = (state: RootState) => state.socketConnections.authToken;

export const selectIsAdmin = (state: RootState) => state.socketConnections.isAdmin;

export const selectPredefinedConnections = (state: RootState) => state.socketConnections.predefinedConnections;

export const selectConnectionForm = (state: RootState) => state.socketConnections.connectionForm;

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

