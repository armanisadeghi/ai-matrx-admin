// lib/logger/server-logger.ts
import { BaseLogger } from './base-logger';
import { LogEntry, ApplicationLog } from './types';
import { v4 as uuidv4 } from 'uuid';
import { logConfig } from './config';

class ServerLogger extends BaseLogger {
    private static instance: ServerLogger;

    private constructor() {
        super('server-logger');
    }

    static getInstance(): ServerLogger {
        if (!ServerLogger.instance) {
            ServerLogger.instance = new ServerLogger();
        }
        return ServerLogger.instance;
    }

    log(entry: Omit<ApplicationLog, 'id' | 'context' | 'category'>): void {
        const enhancedEntry: ApplicationLog = {
            ...entry,
            id: uuidv4(),
            context: {
                timestamp: new Date().toISOString(),
                environment: logConfig.environment,
            },
            category: 'application'
        };

        this.addLog(enhancedEntry);
        this.consoleOutput(enhancedEntry);
        this.processLog(enhancedEntry);
    }

    error(error: Error, metadata?: Record<string, unknown>): void {
        const errorLog: LogEntry = {
            id: uuidv4(),
            category: 'error',
            level: 'error',
            message: error.message,
            context: {
                timestamp: new Date().toISOString(),
                environment: logConfig.environment
            },
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            metadata
        };

        this.addLog(errorLog);
        this.consoleOutput(errorLog);
        this.processLog(errorLog);
    }
}

export const serverLogger = ServerLogger.getInstance();
