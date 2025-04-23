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
        id: connectionId,
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
          setupSocketListeners(socket, store, connectionId);
        }
      });
      break;

    case 'socketConnections/changeNamespace':
      const { connectionId: nsConnectionId, namespace: namespaceChange } = action.payload;
      socketManager.disconnect(nsConnectionId);
      dispatch(setConnection({
        id: nsConnectionId,
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
          setupSocketListeners(socket, store, nsConnectionId);
        }
      });
      break;

    case 'socketConnections/disconnectConnection':
      socketManager.disconnect(action.payload);
      dispatch(setConnectionStatus({ connectionId: action.payload, status: 'disconnected' }));
      dispatch(setSocket({ connectionId: action.payload, socket: null }));
      break;

    case 'socketConnections/addConnection':
      const { id, url: newUrl, namespace: newNamespace } = action.payload;
      dispatch(setConnection({
        id,
        socket: null,
        url: newUrl,
        namespace: newNamespace,
        connectionStatus: 'disconnected',
        isAuthenticated: false,
      }));
      socketManager.getSocket(id, newUrl, newNamespace).then((socket: Socket | null) => {
        if (socket) {
          dispatch(setSocket({ connectionId: id, socket }));
          dispatch(setConnectionStatus({ connectionId: id, status: 'connected' }));
          setupSocketListeners(socket, store, id);
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

  socket.on('connect', () => {
    dispatch(setConnectionStatus({ connectionId, status: 'connected' }));
    dispatch(setIsAuthenticated({ connectionId, isAuthenticated: true }));
    setupGlobalErrorListener(socket, store, connectionId);
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