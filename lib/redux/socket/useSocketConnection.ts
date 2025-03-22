"use client";
import { useState, useEffect, useCallback } from "react";
import { useDispatch } from 'react-redux';
import {
    socketInitialized,
    socketConnecting,
    socketConnected,
    socketDisconnected,
    socketError,
} from '@/lib/redux/socket/actions';
import { SocketManager } from "@/lib/redux/socket/manager";

export const useSocketConnection = () => {
    const dispatch = useDispatch();
    const socketManager = SocketManager.getInstance();
    
    // Local state for connection status
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Handle socket events and reconnection
    const setupSocketListeners = useCallback((socket: any) => {
        const onConnect = () => {
            setIsConnected(true);
            setIsAuthenticated(true);
            dispatch(socketConnected());
            dispatch(socketInitialized());
        };

        const onDisconnect = () => {
            setIsConnected(false);
            setIsAuthenticated(false);
            dispatch(socketDisconnected());
            // Attempt reconnection
            socketManager.connect().catch((error) => {
                console.error('Reconnection failed:', error);
                dispatch(socketError(error.message));
            });
        };

        const onConnectError = (error: Error) => {
            setIsConnected(false);
            setIsAuthenticated(false);
            dispatch(socketError(error.message));
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("connect_error", onConnectError);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("connect_error", onConnectError);
        };
    }, [dispatch, socketManager]);

    // Initialize socket connection
    useEffect(() => {
        let isMounted = true;
        let cleanupListeners: (() => void) | undefined;

        const initializeSocket = async () => {
            try {
                dispatch(socketConnecting());
                await socketManager.connect();
                const socket = await socketManager.getSocket();

                if (!socket || !isMounted) return;

                // Set initial state based on current socket status
                setIsConnected(socket.connected);
                setIsAuthenticated(socket.connected);

                // Setup event listeners
                cleanupListeners = setupSocketListeners(socket);

                // If already connected, trigger connect actions
                if (socket.connected) {
                    dispatch(socketConnected());
                    dispatch(socketInitialized());
                }
            } catch (error) {
                if (isMounted) {
                    console.error('Socket initialization failed:', error);
                    dispatch(socketError((error as Error).message));
                }
            }
        };

        initializeSocket();

        return () => {
            isMounted = false;
            if (cleanupListeners) cleanupListeners();
            socketManager.disconnect();
            dispatch(socketDisconnected());
        };
    }, [dispatch, socketManager, setupSocketListeners]);

    return {
        socketManager,
        isConnected,
        isAuthenticated,
    };
};

export type SocketConnectionHook = ReturnType<typeof useSocketConnection>;