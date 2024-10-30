// lib/logger/redux-middleware.ts
import { Middleware } from 'redux';
import { clientLogger } from './client-logger';
import { v4 as uuidv4 } from 'uuid';
import type { ReduxLog, LogContext } from './types';

interface ReduxAction {
    type: string;
    payload?: unknown;
}

export const loggerMiddleware: Middleware = store => next => (action: ReduxAction) => {
    const prevState = store.getState();
    const result = next(action);
    const nextState = store.getState();

    // Only log if the action type indicates an error (e.g., contains 'ERROR')
    if (!action.type.includes('ERROR')) {
        return result; // Skip logging if it's not an error
    }

    const context: LogContext = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        action: action.type
    };

    const log: ReduxLog = {
        id: uuidv4(),
        category: 'redux',
        level: 'error', // Set log level to 'error' only
        message: `Redux Action Error: ${action.type}`,
        action: {
            type: action.type,
            payload: action.payload
        },
        prevState,
        nextState,
        context
    };

    clientLogger.log(log as any); // Using 'any' here because clientLogger.log expects ApplicationLog

    return result;
};
