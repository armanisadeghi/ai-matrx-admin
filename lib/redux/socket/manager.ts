// lib/redux/socket/manager.ts

import { SagaCoordinator } from '@/lib/redux/sagas/SagaCoordinator';
import { supabase } from '@/utils/supabase/client';

export class SocketManager {
    private static instance: SocketManager;
    private socket: any | null = null;
    private dynamicEventListeners: Map<string, (data: any) => void> = new Map();
    private readonly PRODUCTION_URL = 'https://server.app.matrxserver.com'
    private readonly LOCAL_URL = 'http://localhost:8000';

    private constructor() {}

    static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    private async getSocketAddress(): Promise<string> {
        if (process.env.NEXT_PUBLIC_SOCKET_OVERRIDE) {
            return process.env.NEXT_PUBLIC_SOCKET_OVERRIDE;
        }

        if (process.env.NODE_ENV === 'production') {
            return this.PRODUCTION_URL;
        }

        try {
            const testSocket = await fetch(this.LOCAL_URL, { 
                method: 'HEAD',
                signal: AbortSignal.timeout(2000)
            });
            
            if (testSocket.ok) {
                return this.LOCAL_URL;
            }
        } catch (error) {
            console.log('Local server not available, falling back to production URL');
        }

        return this.PRODUCTION_URL;
    }

    async connect() {
        if (!this.socket) {
            if (typeof window !== 'undefined') {
                try {
                    const { io } = await import('socket.io-client');
                    const socketAddress = await this.getSocketAddress();
                    const session = await supabase.auth.getSession();

                    // Connect directly to the required namespace
                    this.socket = io(`${socketAddress}/UserSession`, {
                        transports: ['polling', 'websocket'],
                        withCredentials: true,
                        auth: {
                            token: session.data.session.access_token
                        }
                    });

                    // Add error handler
                    this.socket.on('connect_error', (error: Error) => {
                        console.log('Socket connection error:', error.message);
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
            // console.log('SocketManager: Disconnected and cleaned up listeners');
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

        socket.on('connect', () => {});

        socket.on('disconnect', () => {});

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
      
        console.log(`Emitting task: ${eventName}`);
              const sid = socket.id;
        const taskName = data[0]?.task || 'unknown_task';
        const taskIndex = data[0]?.index || 0;
        const fallbackEventName = `${sid}_${taskName}_${taskIndex}`;
      
        const fallbackListener = (fallbackResponse: any) => {
          callback(fallbackResponse);
        };
        this.addDynamicEventListener(fallbackEventName, fallbackListener);
      
        socket.emit(eventName, data, (response: { event_name?: string }) => {
          if (response?.event_name) {
            console.log('Task confirmed. Switching listener to event:', response.event_name);
      
            this.removeDynamicEventListener(fallbackEventName);
      
            this.addDynamicEventListener(response.event_name, (finalResponse: any) => {
              callback(finalResponse);
            });
          }
        });
      }
      
    startStreamingTasks<T>(event: string, tasks: T[], onStreamUpdate: (index: number, data: string) => void) {
        tasks.forEach((taskData, index) => {
            const singleTaskPayload = [
                {
                    ...taskData,
                    index,
                    stream: true,
                },
            ];

            this.startTask(event, singleTaskPayload, (response) => {
                if (response?.data) {
                    onStreamUpdate(index, response.data);
                }
            });
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
            listener(data);
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
