// lib/redux/socket/manager.ts

import {EventChannel, eventChannel} from 'redux-saga';
import {SagaCoordinator} from '@/lib/redux/sagas/SagaCoordinator';

export class SocketManager {
    private static instance: SocketManager;
    private socket: any | null = null;
    private dynamicEventListeners: Map<string, (data: any) => void> = new Map(); // Store listeners

    private constructor() {
    }

    static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    async connect() {
        if (!this.socket) {
            if (typeof window !== 'undefined') {
                try {
                    const { io } = await import('socket.io-client');

                    const socketAddress = process.env.SOCKET_OVERRIDE || 'http://localhost:8000' // 'http://matrx.89.116.187.5.sslip.io/'//http://localhost:8000';

                    // Connect directly to the required namespace
                    this.socket = io(`${socketAddress}/UserSession`, {
                        transports: ['websocket', 'polling'],
                        withCredentials: true,
                    });

                    this.registerEventHandlers();

                    console.log(`SocketManager: Connected to ${socketAddress}/UserSession`);
                } catch (error) {
                    console.error('SocketManager: Error connecting socket', error);
                }
            } else {
                console.log('SocketManager: window is undefined, skipping socket connection');
            }
        }
    }

    disconnect() {
        if (this.socket) {
            // Clean up all dynamic listeners before disconnecting
            this.cleanupDynamicListeners();
            this.socket.disconnect();
            this.socket = null;
            console.log('SocketManager: Disconnected and cleaned up listeners');
        }
    }

    getSocket(): any {
        if (!this.socket) {
            throw new Error('Socket is not initialized. Call connect() first.');
        }
        return this.socket;
    }

    private registerEventHandlers() {
        const sagaCoordinator = SagaCoordinator.getInstance();
        const socket = this.getSocket();

        // Standard connection events
        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        // Dynamic listener for responses
        socket.onAny((eventName: string, ...args: any[]) => {
            sagaCoordinator.emitSocketEvent({ eventName, args });
        });
    }

    startTask(eventName: string, data: any, callback: (response: any) => void) {
        const socket = this.getSocket();

        if (!socket || !socket.connected) {
            console.error('Socket not initialized or not connected');
            return;
        }

        console.log(`Emitting task: ${eventName} with data:`, data);

        // Emit the task to the backend
        socket.emit(eventName, data, (response: { event_name?: string }) => {
            const sid = socket.id; // Get the current socket ID
            const taskName = data[0]?.task || 'unknown_task'; // Extract the task name
            const taskIndex = data[0]?.index || '0'; // Default task index to '0'
            const basicEventName = `${sid}_${taskName}_${taskIndex}`;

            if (response?.event_name) {
                console.log('Task confirmed. Listening for event:', response.event_name);

                // Set up a dynamic listener for the provided event name
                this.addDynamicEventListener(response.event_name, callback);
            } else {
                console.log(`No dynamic event name provided. Falling back to: ${basicEventName}`);

                // Set up a fallback listener using the task name
                this.addDynamicEventListener(basicEventName, (fallbackResponse) => {
                    console.log(
                        // `Fallback response received for event: ${basicEventName}`,
                        fallbackResponse
                    );
                    callback(fallbackResponse);
                });
            }
        });
    }

    addDynamicEventListener(eventName: string, listener: (data: any) => void) {
        const socket = this.getSocket();

        if (!socket) {
            console.error('Socket not initialized');
            return;
        }

        if (this.dynamicEventListeners.has(eventName)) {
            console.log(`Listener already exists for event: ${eventName}`);
            return;
        }

        const wrappedListener = (data: any) => {
            // console.log(`Dynamic event received: ${eventName}`, data);
            listener(data); // Pass the data to the provided callback
        };

        socket.on(eventName, wrappedListener);
        this.dynamicEventListeners.set(eventName, wrappedListener);

        console.log(`Dynamic listener added for event: ${eventName}`);
    }

    removeDynamicEventListener(eventName: string) {
        const socket = this.getSocket();

        if (!socket) {
            console.error('Socket not initialized');
            return;
        }

        const listener = this.dynamicEventListeners.get(eventName);
        if (listener) {
            socket.off(eventName, listener);
            this.dynamicEventListeners.delete(eventName);
            console.log(`Dynamic listener removed for event: ${eventName}`);
        }
    }


    listenForResponse(eventName: string, taskIndex: number, callback: (data: any) => void) {
        const socket = this.getSocket();

        if (!socket) {
            console.error('Socket is not initialized.');
            return;
        }

        const sid = socket.id; // Get the socket ID
        const dynamicEventName = `${sid}_${eventName}_${taskIndex}`; // Build the event name

        // Add the listener for the dynamic event
        socket.on(dynamicEventName, (data: any) => {
            console.log(`Received response for event: ${dynamicEventName}`, data); // Log the response
            callback(data); // Pass the data to the provided callback
        });

        console.log(`Listening for response on event: ${dynamicEventName}`);
    }

    emit(event: string, data: any) {
        const socket = this.getSocket();
        console.log(`SocketManager: Emitting event ${event} with data:`, data);
        socket.emit(event, data);
    }

    cleanupDynamicListeners() {
        const socket = this.getSocket();

        if (!socket) {
            console.error('Socket not initialized');
            return;
        }

        this.dynamicEventListeners.forEach((listener, eventName) => {
            socket.off(eventName, listener);
            console.log(`Dynamic listener cleaned up for event: ${eventName}`);
        });

        this.dynamicEventListeners.clear();
    }
}
