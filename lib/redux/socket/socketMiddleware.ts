// lib/redux/socket/socketMiddleware.ts

import { Middleware } from '@reduxjs/toolkit';
import { UnknownAction } from 'redux';
import { SocketManager } from '@/lib/redux/socket/manager';

export const socketMiddleware: Middleware = (storeAPI) => (next) => (action: UnknownAction) => {
    if (action.type.startsWith('EMIT_')) {
        const socketManager = SocketManager.getInstance();
        const event = action.type.replace('EMIT_', '').toLowerCase();
        socketManager.emit(event, action.payload);
    }
    return next(action);
};
