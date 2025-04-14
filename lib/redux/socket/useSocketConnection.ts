"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import {
    socketInitialized,
    socketConnecting,
    socketConnected,
    socketDisconnected,
    socketError,
} from "@/lib/redux/features/socket/socketActions";
import { SocketManager } from "@/lib/redux/socket/manager";
import { SocketConfig } from "@/lib/redux/socket/core/connection-manager";
import {
    setFullUrl,
    setNamespace,
    setCurrentServer as setCurrentSliceServer,
    setIsAuthenticated as setIsAuthenticatedSlice,
} from "../features/socket/socketSlice";

type GlobalState = {
    isConnected: boolean;
    isAuthenticated: boolean;
    currentServer: string | null;
    currentNamespace: string | null;
    socketOverride: { url: string; namespace: string } | null;
    isSwitchingServer: boolean;
    listeners: Set<(state: GlobalState) => void>;
};

// Shared state between hook instances
let globalState: GlobalState = {
    isConnected: false,
    isAuthenticated: false,
    currentServer: null,
    currentNamespace: null,
    socketOverride: null,
    isSwitchingServer: false,
    listeners: new Set(),
};

// Function to notify all hook instances of state changes
const notifyListeners = () => {
    globalState.listeners.forEach(listener => {
        if (typeof listener === 'function') {
            listener(globalState);
        }
    });
};

// Singleton instance
let hookInstance: { [key: string]: any } | null = null;

export const useSocketConnection = () => {
    const dispatch = useDispatch();
    const socketManager = SocketManager.getInstance();
    
    // Local state that will mirror the global state
    const [state, setState] = useState<Pick<GlobalState, 'isConnected' | 'isAuthenticated' | 'currentServer' | 'currentNamespace' | 'isSwitchingServer'>>({
        isConnected: globalState.isConnected,
        isAuthenticated: globalState.isAuthenticated,
        currentServer: globalState.currentServer,
        currentNamespace: globalState.currentNamespace,
        isSwitchingServer: globalState.isSwitchingServer,
    });
    
    // Ref to track if this is the controlling instance
    const isControllingInstance = useRef<boolean>(false);
    
    // Set up the singleton instance if it doesn't exist
    if (!hookInstance) {
        isControllingInstance.current = true;
        hookInstance = {};
        console.log("Created controlling socket hook instance");
    }
    
    // Set up listener for global state changes
    useEffect(() => {
        const updateLocalState = (newGlobalState: GlobalState) => {
            setState({
                isConnected: newGlobalState.isConnected,
                isAuthenticated: newGlobalState.isAuthenticated,
                currentServer: newGlobalState.currentServer,
                currentNamespace: newGlobalState.currentNamespace,
                isSwitchingServer: newGlobalState.isSwitchingServer,
            });
        };
        
        globalState.listeners.add(updateLocalState);
        
        return () => {
            globalState.listeners.delete(updateLocalState);
            
            // Clean up the singleton if this was the controlling instance
            if (isControllingInstance.current && globalState.listeners.size === 0) {
                socketManager.disconnect();
                dispatch(socketDisconnected());
                hookInstance = null;
                console.log("Cleaned up controlling socket hook instance");
            }
        };
    }, [dispatch, socketManager]);
    
    // Only the controlling instance sets up socket listeners
    const setupSocketListeners = useCallback(
        (socket: any) => {
            if (!isControllingInstance.current) return () => {};
            
            const onConnect = () => {
                globalState.isConnected = true;
                globalState.isAuthenticated = socketManager.isAuthenticated();
                globalState.currentServer = socketManager.activeServerUrl();
                globalState.currentNamespace = socketManager.activeNamespace();
                globalState.isSwitchingServer = false;
                notifyListeners();
                
                dispatch(socketConnected());
                dispatch(socketInitialized());
                dispatch(setNamespace(socketManager.activeNamespace()));
                dispatch(setFullUrl(socketManager.activeFullUrl()));
                dispatch(setCurrentSliceServer(socketManager.activeServerUrl()));
                dispatch(setIsAuthenticatedSlice(socketManager.isAuthenticated()));
            };
            
            const onDisconnect = () => {
                globalState.isConnected = false;
                globalState.isAuthenticated = Boolean(socket?.auth?.token);
                if (!globalState.isSwitchingServer) {
                    globalState.currentServer = null;
                    globalState.currentNamespace = null;
                }
                notifyListeners();
                
                dispatch(socketDisconnected());
            };
            
            const onConnectError = (error: Error) => {
                console.log("Socket connection error:", error.message);
                globalState.isConnected = false;
                globalState.isAuthenticated = Boolean(socket?.auth?.token);
                if (!globalState.isSwitchingServer) {
                    globalState.currentServer = null;
                    globalState.currentNamespace = null;
                }
                globalState.isSwitchingServer = false;
                notifyListeners();
                
                dispatch(socketError(error.message));
            };
            
            socket.on("connect", onConnect);
            socket.on("disconnect", onDisconnect);
            socket.on("connect_error", onConnectError);
            
            return () => {
                console.log("Cleaning up socket listeners");
                socket.off("connect", onConnect);
                socket.off("disconnect", onDisconnect);
                socket.off("connect_error", onConnectError);
            };
        },
        [dispatch, socketManager]
    );
    
    // Reusable connection logic - only the controlling instance makes connections
    const connectSocket = useCallback(
        async (override?: { url?: string; namespace?: string } | null, isReconnect = false) => {
            if (!isControllingInstance.current) return () => {};
            
            let cleanupListeners: (() => void) | undefined;
            try {
                console.log(`${isReconnect ? "Reconnecting" : "Connecting"} socket`, { override });
                dispatch(socketConnecting());
                
                const config = override || globalState.socketOverride || undefined;

                if (config) {
                    await socketManager.connect(config as SocketConfig);
                } else {
                    await socketManager.connect();
                }
                const socket = await socketManager.getSocket();
                
                if (!socket) {
                    console.log("Socket not available");
                    return () => {};
                }
                
                globalState.isConnected = socket.connected;
                globalState.isAuthenticated = socketManager.isAuthenticated();
                globalState.currentServer = socketManager.activeServerUrl();
                globalState.currentNamespace = socketManager.activeNamespace();
                notifyListeners();
                
                cleanupListeners = setupSocketListeners(socket);
                
                if (socket.connected) {
                    console.log("Socket already connected, dispatching actions");
                    dispatch(socketConnected());
                    dispatch(socketInitialized());
                }
                
                return cleanupListeners || (() => {});
            } catch (error) {
                console.error(`${isReconnect ? "Reconnection" : "Connection"} failed:`, error);
                globalState.isSwitchingServer = false; // Reset flag on error
                notifyListeners();
                
                dispatch(socketError((error as Error).message));
                return () => {};
            }
        },
        [dispatch, socketManager, setupSocketListeners]
    );
    
    // Only the controlling instance sets up the connection
    useEffect(() => {
        if (!isControllingInstance.current) return;
        
        let isMounted = true;
        let cleanupListeners: (() => void) | undefined;
        let reconnectTimeout: NodeJS.Timeout | null = null;
        
        connectSocket(globalState.socketOverride).then((cleanup) => {
            if (isMounted) {
                cleanupListeners = cleanup;
            }
        });
        
        const scheduleReconnect = () => {
            if (!globalState.isConnected && !globalState.isSwitchingServer) {
                reconnectTimeout = setTimeout(() => {
                    if (isMounted && !globalState.isSwitchingServer) {
                        connectSocket(globalState.socketOverride, true).then((cleanup) => {
                            if (isMounted) {
                                if (cleanupListeners) {
                                    cleanupListeners();
                                }
                                cleanupListeners = cleanup;
                            }
                        });
                    }
                    
                    if (!globalState.isConnected && isMounted && !globalState.isSwitchingServer) {
                        console.log("Still disconnected, scheduling next attempt");
                        scheduleReconnect();
                    } else {
                        console.log("Connected, switching, or unmounted, stopping reconnection attempts");
                    }
                }, 3000);
            }
        };
        
        scheduleReconnect();
        
        return () => {
            isMounted = false;
            if (reconnectTimeout) {
                clearTimeout(reconnectTimeout);
            }
            if (cleanupListeners) {
                cleanupListeners();
            }
        };
    }, [connectSocket]);
    
    // Shared methods that any hook instance can call
    const getAvailableServers = useCallback(async (): Promise<string[]> => {
        try {
            const connectionManager = (socketManager as any).connectionManager as any;
            const servers: string[] = await connectionManager.getPrioritizedUrls("");
            return [...new Set(servers.map((server: string) => server.trim().toLowerCase()))];
        } catch (error) {
            console.error("Failed to fetch available servers:", error);
            return [];
        }
    }, [socketManager]);
    
    const connectToServer = useCallback(
        async (url: string) => {
            try {
                globalState.isSwitchingServer = true;
                notifyListeners();
                
                socketManager.disconnect();
                globalState.isConnected = false;
                globalState.isAuthenticated = false;
                notifyListeners();
                
                const normalizedUrl = url.trim().toLowerCase();
                const newOverride = {
                    url: normalizedUrl,
                    namespace: globalState.socketOverride?.namespace || "/UserSession",
                };
                
                globalState.socketOverride = newOverride;
                globalState.currentServer = socketManager.activeServerUrl();
                globalState.currentNamespace = socketManager.activeNamespace();
                notifyListeners();
                
                if (isControllingInstance.current) {
                    await connectSocket(newOverride);
                }
            } catch (error) {
                console.error("Failed to connect to server:", error);
                globalState.isSwitchingServer = false;
                notifyListeners();
                
                dispatch(socketError((error as Error).message));
            }
        },
        [socketManager, dispatch, connectSocket]
    );
    
    const overrideNamespace = useCallback(
        async (namespace: string) => {
            console.log("Overriding namespace:", { namespace });
            try {
                globalState.isSwitchingServer = true;
                notifyListeners();
                
                socketManager.disconnect();
                globalState.isConnected = false;
                globalState.isAuthenticated = false;
                notifyListeners();
                
                const newOverride = {
                    url: globalState.socketOverride?.url,
                    namespace,
                };
                
                globalState.socketOverride = newOverride;
                notifyListeners();
                
                if (isControllingInstance.current) {
                    await connectSocket(newOverride);
                }
            } catch (error) {
                console.error("Failed to override namespace:", error);
                globalState.isSwitchingServer = false;
                notifyListeners();
                
                dispatch(socketError((error as Error).message));
            }
        },
        [socketManager, dispatch, connectSocket]
    );
    
    const clearServerOverride = useCallback(async () => {
        console.log("Clearing server override");
        globalState.isSwitchingServer = true;
        globalState.socketOverride = null;
        notifyListeners();
        
        socketManager.disconnect();
        
        // Add a small delay to ensure the disconnect has completed
        await new Promise(resolve => setTimeout(resolve, 300));
        
        globalState.isConnected = false;
        globalState.isAuthenticated = false;
        globalState.currentServer = null;
        globalState.currentNamespace = null;
        notifyListeners();
        
        if (isControllingInstance.current) {
            try {
                await connectSocket();
                console.log("Successfully reconnected after clearing override");
            } catch (error) {
                console.error("Failed to reconnect after clearing override:", error);
            }
        }
    }, [socketManager, connectSocket]);

    return {
        socketManager,
        isConnected: state.isConnected,
        isAuthenticated: state.isAuthenticated,
        getAvailableServers,
        connectToServer,
        overrideNamespace,
        clearServerOverride,
        currentServer: state.currentServer,
        currentNamespace: state.currentNamespace,
    };
};

export type SocketConnectionHook = ReturnType<typeof useSocketConnection>;