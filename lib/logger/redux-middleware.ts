// lib/logger/redux-middleware.ts
import { Middleware } from 'redux';
import { BaseLogger } from './base-logger';
import { ReduxLog } from './types';
import { logConfig } from './config';
import { v4 as uuidv4 } from 'uuid';

interface ReduxAction {
    type: string;
    payload?: unknown;
}

class ReduxLogger extends BaseLogger {
    private static instance: ReduxLogger;

    private constructor() {
        super('redux-logger');
    }

    static getInstance(): ReduxLogger {
        if (!ReduxLogger.instance) {
            ReduxLogger.instance = new ReduxLogger();
        }
        return ReduxLogger.instance;
    }

    logAction(action: ReduxAction, prevState: unknown, nextState: unknown): void {
        // Only log if the action type indicates an error
        if (!action.type.includes('ERROR')) return;

        const log: ReduxLog = {
            id: uuidv4(),
            category: 'redux',
            level: 'error',
            message: `Redux Action Error: ${action.type}`,
            action: {
                type: action.type,
                payload: action.payload
            },
            prevState,
            nextState,
            context: {
                timestamp: new Date().toISOString(),
                environment: logConfig.environment,
                action: action.type
            }
        };

        this.addLog(log);
        this.consoleOutput(log);
        this.processLog(log);
    }
}

const reduxLogger = ReduxLogger.getInstance();

export const loggerMiddleware: Middleware = store => next => (action: ReduxAction) => {
    const prevState = store.getState();
    const result = next(action);
    const nextState = store.getState();

    reduxLogger.logAction(action, prevState, nextState);

    return result;
};
