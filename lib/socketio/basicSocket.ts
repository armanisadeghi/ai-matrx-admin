import { io, Socket } from 'socket.io-client';

const URL = 'http://localhost:8000/';
let basicSocket: Socket | null = null;

export const initializeSocket = (userToken: string) => {
    console.log('Initializing socket');
    if (basicSocket) {
        console.log('Socket already exists, disconnecting');
        basicSocket.disconnect();
    }

    basicSocket = io(URL, { autoConnect: false });

    basicSocket.on('connect', () => {
        console.log('Connected to socket server');
        basicSocket?.emit('authenticate', { token: userToken });
        console.log('Authentication event emitted');
    });

    basicSocket.on('disconnect', () => {
        console.log('Disconnected from socket server');
    });

    basicSocket.on('error', (error: any) => {
        console.error('Socket.IO error:', error);
    });

    basicSocket.connect();
    console.log('Socket connection initiated');
};

export const emitEvent = (
    eventName: "matrix_chat" | "playground_stream" | "run_recipe" | "validation" | "workflow" = "matrix_chat",
    data: any, callback?: (response: any) => void) => {
    console.log(`Emitting event: ${eventName}`, data);
    if (!basicSocket || !basicSocket.connected) {
        console.error('Socket not initialized or not connected');
        return;
    }
    basicSocket.emit(eventName, data, (response: any) => {
        console.log(`Response received for ${eventName}:`, response);
        if (callback) callback(response);
    });
};

export const waitForEvent = (eventName: string, callback: (data: any) => void) => {
    console.log(`Setting up listener for event: ${eventName}`);
    if (!basicSocket) {
        console.error('Socket not initialized');
        return;
    }
    basicSocket.on(eventName, (data: any) => {
        console.log(`Event ${eventName} received:`, data);
        callback(data);
    });
};

export const closeSocket = () => {
    if (basicSocket) {
        basicSocket.disconnect();
        basicSocket = null;
        console.log('Socket disconnected and reset');
    }
};

export const getSocket = () => basicSocket;
