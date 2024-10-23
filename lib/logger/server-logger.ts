// lib/logger/server-logger.ts

import { LogEntry, LogContext, ApplicationLog } from './types';
import { v4 as uuidv4 } from 'uuid';

class ServerLogger {
    log(entry: Omit<ApplicationLog, 'id' | 'context' | 'category'>): void {
        const context: LogContext = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
        };

        const enhancedEntry: ApplicationLog = {
            ...entry,
            id: uuidv4(),
            context,
            category: 'application'
        };

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            const logMethod = entry.level === 'error' ? console.error :
                entry.level === 'warn' ? console.warn :
                    entry.level === 'debug' ? console.debug :
                        console.log;
            logMethod(enhancedEntry);
        }

        // In production, send to logging service
        if (process.env.NODE_ENV === 'production' && process.env.LOGGING_SERVICE_URL) {
            fetch(process.env.LOGGING_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.LOGGING_SERVICE_API_KEY}`
                },
                body: JSON.stringify([enhancedEntry])
            }).catch(error => {
                console.error('Failed to send log to logging service:', error);
            });
        }
    }

    error(error: Error, metadata?: Record<string, unknown>): void {
        const context: LogContext = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        };

        const errorLog: LogEntry = {
            id: uuidv4(),
            category: 'error',
            level: 'error',
            message: error.message,
            context,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            metadata
        };

        if (process.env.NODE_ENV === 'development') {
            console.error(errorLog);
        }

        // Send to logging service
        if (process.env.NODE_ENV === 'production' && process.env.LOGGING_SERVICE_URL) {
            fetch(process.env.LOGGING_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.LOGGING_SERVICE_API_KEY}`
                },
                body: JSON.stringify([errorLog])
            }).catch(error => {
                console.error('Failed to send error log to logging service:', error);
            });
        }
    }
}

export const serverLogger = new ServerLogger();
