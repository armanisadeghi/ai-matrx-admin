import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { SocketConnectionManager } from './socketConnectionManager';
import {
  setConnection,
  setSocket,
  setConnectionStatus,
  setAuthToken,
  setIsAdmin,
} from '../slices/socketConnectionsSlice';

export function useSocketInit() {
  const dispatch = useDispatch();

  useEffect(() => {
    const socketManager = SocketConnectionManager.getInstance();

    // Initialize the primary connection
    socketManager.initializePrimaryConnection().then(async (connectionId) => {
      const socket = await socketManager.getSocket(
        connectionId,
        socketManager.getUrl(connectionId),
        socketManager.getNamespace(connectionId)
      );
      if (socket) {
        // Update Redux state with connection details
        dispatch(
          setConnection({
            id: connectionId,
            socket,
            url: socketManager.getUrl(connectionId),
            namespace: socketManager.getNamespace(connectionId),
            connectionStatus: 'connected',
            isAuthenticated: true,
          })
        );

        // Set session-wide auth token and admin status
        const authToken = await socketManager.getAuthToken();
        dispatch(setAuthToken(authToken));
        const isAdmin = await socketManager.isAdmin();
        dispatch(setIsAdmin(isAdmin));

        // Set up event listeners
        socket.on('connect', () => {
          dispatch(setConnectionStatus({ connectionId, status: 'connected' }));
        });

        socket.on('disconnect', () => {
          dispatch(setConnectionStatus({ connectionId, status: 'disconnected' }));
        });

        socket.on('connect_error', () => {
          dispatch(setConnectionStatus({ connectionId, status: 'error' }));
        });
      }
    });

    // No cleanup needed as the socket manager is a singleton
  }, [dispatch]);
}