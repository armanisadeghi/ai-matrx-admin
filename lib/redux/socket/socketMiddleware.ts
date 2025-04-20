// lib/redux/socket/socketMiddleware.ts

import { Middleware } from '@reduxjs/toolkit';
import { UnknownAction } from 'redux';
import { SocketManager } from '@/lib/redux/socket/SocketManager';

export const socketMiddleware: Middleware = (storeAPI) => (next) => (action: UnknownAction) => {
    const socketManager = SocketManager.getInstance();

    // Handle dynamic socket emissions
    if (action.type.startsWith('EMIT_')) {
        const event = action.type.replace('EMIT_', '').toLowerCase();
        console.log(`SocketMiddleware: Emitting ${event} with payload:`, action.payload);
        socketManager.emit(event, action.payload);
    }

    // Dispatch socket connection states
    switch (action.type) {
        case 'SOCKET_CONNECTING':
            // console.log('SocketMiddleware: Socket is connecting...');
            break;
        case 'SOCKET_CONNECTED':
            // console.log('SocketMiddleware: Socket connected');
            break;
        case 'SOCKET_DISCONNECTED':
            console.log('SocketMiddleware: Socket disconnected');
            break;
        case 'SOCKET_ERROR':
            console.error('SocketMiddleware: Socket error:', action.payload);
            break;
        default:
            break;
    }

    return next(action);
};
