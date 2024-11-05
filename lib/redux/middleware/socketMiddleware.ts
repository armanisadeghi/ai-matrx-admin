// lib/redux/middleware/socketMiddleware.ts

import { Middleware, AnyAction } from '@reduxjs/toolkit';
import { SocketManager } from '@/lib/socket/SocketManager';

export const socketMiddleware: Middleware = (storeAPI) => (next) => (action: AnyAction) => {
    if (action.type.startsWith('EMIT_')) {
        const socketManager = SocketManager.getInstance();
        const event = action.type.replace('EMIT_', '').toLowerCase();
        socketManager.emit(event, action.payload);
    }
    return next(action);
};
