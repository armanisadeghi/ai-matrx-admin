import { Middleware, MiddlewareAPI } from 'redux';
import { PayloadAction } from '@reduxjs/toolkit';
import { Socket } from 'socket.io-client';
import { SocketConnectionManager } from './socketConnectionManager';
import { 
  setConnection, 
  setSocket, 
  setConnectionStatus,
  setIsAuthenticated,
} from '../slices/socketConnectionsSlice';
import { updateErrorResponse } from '../slices/socketResponseSlice';
import { AppDispatch, RootState } from '@/lib/redux/store';

interface SocketAction {
  type: string;
  payload?: any;
}

export const socketMiddleware: Middleware = (store: MiddlewareAPI<AppDispatch, RootState>) => (next) => (action: SocketAction) => {
  const socketManager = SocketConnectionManager.getInstance();
  const { dispatch, getState } = store;

  switch (action.type) {
    case 'socketConnections/changeConnectionUrl':
      const { connectionId, url: urlChange } = action.payload;
      socketManager.disconnect(connectionId);
      dispatch(setConnection({
        connectionId: connectionId,
        socket: null,
        url: urlChange,
        namespace: getState().socketConnections.connections[connectionId]?.namespace || '/UserSession',
        connectionStatus: 'disconnected',
        isAuthenticated: false,
      }));
      socketManager.getSocket(connectionId, urlChange, getState().socketConnections.connections[connectionId]?.namespace || '/UserSession').then((socket: Socket | null) => {
        if (socket) {
          dispatch(setSocket({ connectionId, socket }));
          dispatch(setConnectionStatus({ connectionId, status: 'connected' }));
          
          const isAuthenticated = socketManager.isAuthenticated(connectionId);
          dispatch(setIsAuthenticated({ connectionId, isAuthenticated }));
          
          setupSocketListeners(socket, store, connectionId);
        }
      });
      break;

    case 'socketConnections/changeNamespace':
      const { connectionId: nsConnectionId, namespace: namespaceChange } = action.payload;
      socketManager.disconnect(nsConnectionId);
      dispatch(setConnection({
        connectionId: nsConnectionId,
        socket: null,
        url: getState().socketConnections.connections[nsConnectionId]?.url || 'https://server.app.matrxserver.com',
        namespace: namespaceChange,
        connectionStatus: 'disconnected',
        isAuthenticated: false,
      }));
      socketManager.getSocket(nsConnectionId, getState().socketConnections.connections[nsConnectionId]?.url || 'https://server.app.matrxserver.com', namespaceChange).then((socket: Socket | null) => {
        if (socket) {
          dispatch(setSocket({ connectionId: nsConnectionId, socket }));
          dispatch(setConnectionStatus({ connectionId: nsConnectionId, status: 'connected' }));
          
          const isAuthenticated = socketManager.isAuthenticated(nsConnectionId);
          dispatch(setIsAuthenticated({ connectionId: nsConnectionId, isAuthenticated }));
          
          setupSocketListeners(socket, store, nsConnectionId);
        }
      });
      break;

    case 'socketConnections/disconnectConnection':
      socketManager.disconnect(action.payload);
      dispatch(setConnectionStatus({ connectionId: action.payload, status: 'disconnected' }));
      dispatch(setSocket({ connectionId: action.payload, socket: null }));
      dispatch(setIsAuthenticated({ connectionId: action.payload, isAuthenticated: false }));
      break;

    case 'socketConnections/reconnectConnection':
      const connId = action.payload;
      // Mark as connecting first
      dispatch(setConnectionStatus({ connectionId: connId, status: 'connecting' }));
      
      // Get connection details from state
      const connection = getState().socketConnections.connections[connId];
      if (!connection) {
        return next(action);
      }
      
      // Attempt to reconnect using stored details
      socketManager.reconnect(connId).then((socket: Socket | null) => {
        if (socket) {
          dispatch(setSocket({ connectionId: connId, socket }));
          dispatch(setConnectionStatus({ connectionId: connId, status: 'connected' }));
          
          const isAuthenticated = socketManager.isAuthenticated(connId);
          dispatch(setIsAuthenticated({ connectionId: connId, isAuthenticated }));
          
          setupSocketListeners(socket, store, connId);
        } else {
          dispatch(setConnectionStatus({ connectionId: connId, status: 'error' }));
          dispatch(setIsAuthenticated({ connectionId: connId, isAuthenticated: false }));
        }
      });
      break;

    case 'socketConnections/deleteConnection':
      const deleteConnId = action.payload;
      // Cannot delete primary connection
      if (deleteConnId === getState().socketConnections.primaryConnectionId) {
        return next(action);
      }
      // Disconnect first if connected
      socketManager.deleteConnection(deleteConnId);
      break;

    case 'socketConnections/addConnection':
      const { connectionId: addConnectionId, url: newUrl, namespace: newNamespace } = action.payload;
      dispatch(setConnection({
        connectionId: addConnectionId,
        socket: null,
        url: newUrl,
        namespace: newNamespace,
        connectionStatus: 'disconnected',
        isAuthenticated: false,
      }));
      socketManager.getSocket(addConnectionId, newUrl, newNamespace).then((socket: Socket | null) => {
        if (socket) {
          dispatch(setSocket({ connectionId: addConnectionId, socket }));
          dispatch(setConnectionStatus({ connectionId: addConnectionId, status: 'connected' }));
          
          const isAuthenticated = socketManager.isAuthenticated(addConnectionId);
          dispatch(setIsAuthenticated({ connectionId: addConnectionId, isAuthenticated }));
          
          setupSocketListeners(socket, store, addConnectionId);
        }
      });
      break;

    case 'socketConnections/setPrimaryConnection':
      socketManager.setPrimaryConnection(action.payload);
      break;
  }

  return next(action);
};

function setupSocketListeners(socket: Socket, store: MiddlewareAPI<AppDispatch, RootState>, connectionId: string) {
  const { dispatch } = store;
  const socketManager = SocketConnectionManager.getInstance();

  socket.on('connect', () => {
    dispatch(setConnectionStatus({ connectionId, status: 'connected' }));
    
    // Update authentication status based on the socket manager's authentication status
    // When we connect with a token, we're authenticated immediately
    const isAuth = socketManager.isAuthenticated(connectionId);
    dispatch(setIsAuthenticated({ connectionId, isAuthenticated: isAuth }));
    
    setupGlobalErrorListener(socket, store, connectionId);
  });

  // Handle authentication events
  socket.on('authenticated', () => {
    dispatch(setIsAuthenticated({ connectionId, isAuthenticated: true }));
  });

  socket.on('unauthorized', () => {
    dispatch(setIsAuthenticated({ connectionId, isAuthenticated: false }));
  });

  socket.on('disconnect', () => {
    dispatch(setConnectionStatus({ connectionId, status: 'disconnected' }));
    dispatch(setIsAuthenticated({ connectionId, isAuthenticated: false }));
  });

  socket.on('connect_error', () => {
    dispatch(setConnectionStatus({ connectionId, status: 'error' }));
    dispatch(setIsAuthenticated({ connectionId, isAuthenticated: false }));
  });
}

function setupGlobalErrorListener(socket: Socket, store: MiddlewareAPI<AppDispatch, RootState>, connectionId: string) {
  const { dispatch, getState } = store;
  socket.off('global_error');
  socket.on('global_error', (errorData) => {
    const errorMessage = typeof errorData === 'string' 
      ? errorData 
      : errorData?.message || errorData?.error || 'Unknown global error';
    const responses = getState().socketResponse;
    const activeListenerIds = Object.keys(responses);
    if (activeListenerIds.length > 0) {
      activeListenerIds.forEach(listenerId => {
        dispatch(updateErrorResponse({ 
          listenerId, 
          error: {
            message: `Global error: ${errorMessage}`,
            type: 'global_error',
            user_visible_message: 'A global error occurred',
            code: 'GLOBAL_ERROR',
            details: {}
          }
        }));
      });
    } else {
      console.warn(`[SOCKET] Global error received for connection ${connectionId} but no active responses`);
    }
  });
}