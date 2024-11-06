// lib/redux/socket/manager.ts

import { EventChannel, eventChannel } from 'redux-saga';
import { SagaCoordinator } from '@/lib/redux/sagas/SagaCoordinator';

export class SocketManager {
    private static instance: SocketManager;
    private socket: any | null = null;

    private constructor() {}

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

                    // Check for SOCKET_OVERRIDE in .env, fallback to default if not present
                    const socketAddress = process.env.SOCKET_OVERRIDE || 'https://aimatrixengine.com/';

                    this.socket = io(socketAddress);
                    this.registerEventHandlers();

                    console.log(`SocketManager: Connected to ${socketAddress}`);
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
            this.socket.disconnect();
            this.socket = null;
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

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        // Handle dynamic events and forward them to the Saga Coordinator
        socket.onAny((eventName: string, ...args: any[]) => {
            sagaCoordinator.emitSocketEvent({ eventName, args });
        });
    }

    emit(event: string, data: any) {
        const socket = this.getSocket();
        socket.emit(event, data);
    }
}
