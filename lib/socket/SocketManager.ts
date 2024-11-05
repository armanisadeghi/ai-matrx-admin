// lib/socket/SocketManager.ts

import { io, Socket } from 'socket.io-client';
import { EventChannel, eventChannel } from 'redux-saga';
import { SagaCoordinator } from '@/lib/redux/sagas/SagaCoordinator';

export class SocketManager {
    private static instance: SocketManager;
    private socket: Socket | null = null;

    private constructor() {}

    static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    connect() {
        if (!this.socket) {
            this.socket = io('https://aimatrixengine.com/'); // Replace with your backend URL
            this.registerEventHandlers();
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket(): Socket {
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
        socket.onAny((eventName, ...args) => {
            sagaCoordinator.emitSocketEvent({ eventName, args });
        });
    }

    emit(event: string, data: any) {
        const socket = this.getSocket();
        socket.emit(event, data);
    }
}
