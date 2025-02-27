"use client";
import { useState, useEffect } from "react";
import { useDispatch } from 'react-redux';
import {
    socketInitialized,
    socketConnecting,
    socketConnected,
    socketDisconnected,
    socketError,
} from '@/lib/redux/socket/actions';
import { SocketManager } from "@/lib/redux/socket/manager";

/**
 * Hook for socket initialization, connection management, and status tracking.
 * This hook replaces the original useInitializeSocket and adds connection status.
 */
export const useSocketConnection = () => {
    const dispatch = useDispatch();
    
    // Get the singleton instance of the socket manager
    const socketManager = SocketManager.getInstance();
    
    // Track connection state
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    // Initialize socket and connection state
    useEffect(() => {
        let mounted = true;
        
        // Handle connection setup
        dispatch(socketConnecting());
        
        socketManager
            .connect()
            .then(() => {
                if (mounted) {
                    dispatch(socketConnected());
                    dispatch(socketInitialized());
                }
            })
            .catch((error) => {
                if (mounted) {
                    console.error('Socket connection error:', error);
                    dispatch(socketError(error.message));
                }
            });
            
        // Handle disconnect on unmount
        return () => {
            mounted = false;
            socketManager.disconnect();
            dispatch(socketDisconnected());
        };
    }, [dispatch]);
    
    // Connection checker effect
    useEffect(() => {
        let mounted = true;
        let checkInterval: NodeJS.Timeout;
        
        const checkConnection = () => {
            try {
                const socket = socketManager.getSocket();
                if (mounted && socket) {
                    setIsConnected(socket.connected);
                    setIsAuthenticated(socket.connected);
                }
            } catch (error) {
                if (mounted) {
                    setIsConnected(false);
                    setIsAuthenticated(false);
                }
            }
        };
        
        // Check immediately and then set up interval
        checkConnection();
        checkInterval = setInterval(checkConnection, 1000);
        
        // Clean up on unmount
        return () => {
            mounted = false;
            if (checkInterval) {
                clearInterval(checkInterval);
            }
        };
    }, []);
    
    return {
        socketManager,
        isConnected,
        isAuthenticated
    };
};

export type SocketConnectionHook = ReturnType<typeof useSocketConnection>;