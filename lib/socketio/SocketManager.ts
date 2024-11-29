// utils/socketio/SocketManager.ts

import { io, Socket } from 'socket.io-client';
import { EventHandler } from './EventHandler';
import { SocketStatus, AuthResponse, SocketTask } from './types';

export class SocketManager {
    private static instance: SocketManager | null = null;
    private socket: Socket | null = null;
    private matrixId: string;
    private eventHandler: EventHandler;
    private setSocketStatus: (status: SocketStatus) => void;
    private setIsAuthenticated: (isAuth: boolean) => void;
    private setSid: (sid: string | null) => void;
    private isAuthenticated: boolean = false;
    private dynamicEventListeners: Map<string, (data: any) => void> = new Map();
    private sessionUrl: string;
    private socketNamespace: string;
    private sid: string | null = null;
    private loggedEvents: Set<string> = new Set();

    private constructor(matrixId: string, sessionUrl: string, socketNamespace: string) {
        this.matrixId = matrixId;
        this.sessionUrl = sessionUrl;
        this.socketNamespace = socketNamespace;
        this.eventHandler = new EventHandler();
        this.dynamicEventListeners = new Map();
    }

    static getInstance(matrixId: string, sessionUrl: string, socketNamespace: string): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager(matrixId, sessionUrl, socketNamespace);
        }
        return SocketManager.instance;
    }

    initialize(
        setSocketStatus: (status: SocketStatus) => void,
        setIsAuthenticated: (isAuth: boolean) => void,
        setSid: (sid: string | null) => void
    ) {
        this.setSocketStatus = setSocketStatus;
        this.setIsAuthenticated = setIsAuthenticated;
        this.setSid = setSid;
    }

    setupSocket() {
        if (this.socket) {
            console.log('Socket already set up');
            return;
        }

        this.socket = io(this.sessionUrl + this.socketNamespace, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        this.setupSocketListeners();
        this.setupCatchallListener();
        this.setupRawPacketListener();
    }

    private setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('UserSession socket connected', this.socket?.id);
            this.setSocketStatus('connected');
            this.sid = this.socket?.id || null;
            this.setSid(this.sid);
                this.reconnectSession();
        });

        this.socket.on('connect_error', (error: Error) => {
            console.error('Connection error:', error);
            this.setSocketStatus('error');
        });

        this.socket.on('disconnect', () => {
            console.log('UserSession socket disconnected');
            this.setSocketStatus('disconnected');
            this.sid = null;
            this.setSid(null);
        });

        this.socket.on('incoming_stream_event', (data: { event_name: string }) => {
            console.log('Received incoming stream event:', data.event_name);
            this.setupDynamicEventListener(data.event_name);
        });
    }

    authenticateUser(activeUser: any) {
        if (!this.socket) {
            console.error('Socket not initialized in authenticateUser');
            return;
        }

        this.socket.emit('authenticate', activeUser, (response: AuthResponse) => {
            if (response && response.status === 'success') {
                if (response.matrix_id !== this.matrixId) {
                    console.error('MatrixId mismatch during authentication');
                    this.setSocketStatus('error');
                    return;
                }
                console.log('Authentication successful', response);
                this.isAuthenticated = true;
                this.setIsAuthenticated(true);
                this.setSocketStatus('authenticated');
            } else {
                console.error('Authentication failed:', response?.message);
                this.setSocketStatus('error');
            }
        });
    }

    reconnectSession() {
        if (!this.socket) return;

        console.log('Attempting to reconnect session with matrixId:', this.matrixId);
        this.socket.emit('reconnect', {matrix_id: this.matrixId}, (response: AuthResponse) => {
            console.log('Reconnect response:', response);
            if (response && response.status === 'success') {
                if (response.matrix_id !== this.matrixId) {
                    console.error('MatrixId mismatch during reconnection');
                    this.setSocketStatus('error');
                    return;
                }
                console.log('Reconnection successful', response);
                this.isAuthenticated = true;
                this.setIsAuthenticated(true);
                this.setSocketStatus('authenticated');
            } else {
                console.error('Reconnection failed:', response?.message);
                this.isAuthenticated = false;
                this.setIsAuthenticated(false);
                this.setSocketStatus('connected');
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocketSid(): string | null {
        return this.sid;
    }

    getSocket(): Socket | null {
        return this.socket;
    }

    isAuthenticatedAndConnected(): boolean {
        return this.isAuthenticated && this.socket !== null && this.socket.connected;
    }

    startTask(eventName: string, data: SocketTask) {
        if (!this.socket || !this.socket.connected) {
            console.error('Socket not initialized or not connected');
            return;
        }
        console.log('Emitting to namespace:', this.socketNamespace, 'Event:', eventName, 'Data:', data);
        this.socket.emit(eventName, data, (response: any) => {
            if (response && response.status === 'error') {
                console.error('Error starting task:', response.message);
            } else {
                console.log('Task started successfully:', response);
            }
        });
    }

    addDynamicEventListener(eventName: string, listener: (data: any) => void) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        this.socket.on(eventName, listener);
        this.dynamicEventListeners.set(eventName, listener);
    }

    removeDynamicEventListener(eventName: string) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        const listener = this.dynamicEventListeners.get(eventName);
        if (listener) {
            this.socket.off(eventName, listener);
            this.dynamicEventListeners.delete(eventName);
        }
    }


    private setupRawPacketListener() {
        if (!this.socket) return;

        this.socket.io.engine.on('packet', (packet: any) => {
            if (packet.type === 'message') {
/*
                console.log(`Debug: Raw packet received:`, packet.data);
*/
            }
        });
    }

    private setupDynamicEventListener(eventName: string) {
        if (!this.socket) return;

        const listener = (data: any) => {
            if (!this.loggedEvents.has(eventName)) {
                console.log(`Dynamic event received: ${eventName}`, data);
                this.loggedEvents.add(eventName);
            }
            this.eventHandler.handleEvent(eventName, data);
        };

        this.socket.on(eventName, listener);
        this.dynamicEventListeners.set(eventName, listener);
    }

    private listenForIndividualEvent(eventName: string) {
        this.socket?.off(eventName);

        this.socket?.on(eventName, (data: any) => {
            console.log(`Event ${eventName} received data:`, data);
            this.eventHandler.handleEvent(eventName, data);
        });
    }

    registerEventCallback(eventName: string, callback: (data: any) => void) {
        this.eventHandler.registerCallback(eventName, callback);
    }

    unregisterEventCallback(eventName: string, callback: (data: any) => void) {
        this.eventHandler.unregisterCallback(eventName, callback);
    }

    emitMessage(eventName: string, data: any) {
        if (!this.socket || !this.socket.connected) {
            console.error('Socket not initialized or not connected');
            return;
        }
        this.socket.emit(eventName, data);
    }

    private setupCatchallListener() {
        if (!this.socket) return;

        this.socket.onAny((eventName, ...args) => {
            // console.log(`Catchall - Namespace event received: ${eventName}`, args);
        });
    }


    addCatchallListener(callback: (eventName: string, ...args: any[]) => void) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        this.socket.onAny(callback);
    }

    removeCatchallListener(callback: (eventName: string, ...args: any[]) => void) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        this.socket.offAny(callback);
    }
    addDirectListener(eventName: string, callback: (data: any) => void) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        this.socket.on(eventName, callback);
    }

    removeDirectListener(eventName: string, callback: (data: any) => void) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        this.socket.off(eventName, callback);
    }

    addRawPacketListener(callback: (packet: any) => void) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        this.socket.io.engine.on('packet', callback);
    }

    removeRawPacketListener(callback: (packet: any) => void) {
        if (!this.socket) {
            console.error('Socket not initialized');
            return;
        }
        this.socket.io.engine.off('packet', callback);
    }
}



/*


removeDynamicEventListener(eventName: string) {
    if (!this.socket) return;

    const listener = this.dynamicEventListeners.get(eventName);
    if (listener) {
        this.socket.off(eventName, listener);
        this.dynamicEventListeners.delete(eventName);
    }
}
*/

