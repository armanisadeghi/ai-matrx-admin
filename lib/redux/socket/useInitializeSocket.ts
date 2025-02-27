// lib/redux/socket/useInitializeSocket.ts

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import {
    socketInitialized,
    socketConnecting,
    socketConnected,
    socketDisconnected,
    socketError,
} from '@/lib/redux/socket/actions';
import { SocketManager } from '@/lib/redux/socket/manager';

export const useInitializeSocket = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const socketManager = SocketManager.getInstance();

        // Handle connection states
        dispatch(socketConnecting());
        socketManager
            .connect()
            .then(() => {
                dispatch(socketConnected());
                dispatch(socketInitialized());
            })
            .catch((error) => {
                console.error('Socket connection error:', error);
                dispatch(socketError(error.message));
            });

        // Handle disconnect on unmount
        return () => {
            socketManager.disconnect();
            dispatch(socketDisconnected());
        };
    }, [dispatch]);
};

export type InitializeSocketHook = ReturnType<typeof useInitializeSocket>;
