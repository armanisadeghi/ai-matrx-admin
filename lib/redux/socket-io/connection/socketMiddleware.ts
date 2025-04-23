import { Middleware } from 'redux';
import { PayloadAction } from '@reduxjs/toolkit';
import { SocketConnectionManager } from './socketConnectionManager';
import { 
  setConnection, 
  setSocket, 
  setConnectionStatus,
  setIsAuthenticated,
} from '../slices/socketConnectionsSlice';
import { updateErrorResponse } from '../slices/socketResponseSlice';

interface SocketAction {
  type: string;
  payload?: any;
}

export const socketMiddleware: Middleware = store => next => (action: SocketAction) => {
  const socketManager = SocketConnectionManager.getInstance();
  const { dispatch } = store;

  switch (action.type) {
    case 'socketConnections/changeConnectionUrl':
      const { connectionId, url } = action.payload;
      socketManager.disconnect(connectionId);
      dispatch(setConnection({
        id: connectionId,
        socket: null,
        url,
        namespace: store.getState().socketConnections.connections[connectionId]?.namespace || '/UserSession',
        connectionStatus: 'disconnected',
        isAuthenticated: false,
      }));
      socketManager.getSocket(connectionId, url, store.getState().socketConnections.connections[connectionId]?.namespace).then(socket => {
        if (socket) {
          dispatch(setSocket({ connectionId, socket }));
          dispatch(setConnectionStatus({ connectionId, status: 'connected' }));
          setupSocketListeners(socket, store, connectionId);
        }
      });
      break;

    case 'socketConnections/changeNamespace':
      const { connectionId: nsConnectionId, namespace } = action.payload;
      socketManager.disconnect(nsConnectionId);
      dispatch(setConnection({
        id: nsConnectionId,
        socket: null,
        url: store.getState().socketConnections.connections[nsConnectionId]?.url,
        namespace,
        connectionStatus: 'disconnected',
        isAuthenticated: false,
      }));
      socketManager.getSocket(nsConnectionId, store.getState().socketConnections.connections[nsConnectionId]?.url, namespace).then(socket => {
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
      socketManager.getSocket(id, newUrl, newNamespace).then(socket => {
        if (socket) {
          dispatch(setSocket({ connectionId: id, socket }));
          dispatch(setConnectionStatus({ connectionId: id, status: 'connected' }));
          setupSocketListeners(socket, store, id);
        }
      });
      break;
  }

  return next(action);
};

function setupSocketListeners(socket, store, connectionId: string) {
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

function setupGlobalErrorListener(socket, store, connectionId: string) {
  const { dispatch, getState } = store;
  socket.off('global_error');
  socket.on('global_error', (errorData) => {
    const errorMessage = typeof errorData === 'string' 
      ? errorData 
      : errorData?.message || errorData?.error || 'Unknown global error';
    const streams = getState().socketResponse;
    const activeListenerIds = Object.keys(streams);
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
      console.warn(`[SOCKET] Global error received for connection ${connectionId} but no active streams`);
    }
  });
}