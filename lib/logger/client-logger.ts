// lib/logger/client-logger.ts

'use client';

import { v4 as uuidv4 } from 'uuid';
import { LogStorage } from './storage';
import { LogEntry, LogContext, ApplicationLog } from './types';

class ClientLogger {
    private logQueue: LogEntry[] = [];
    private flushTimeout: NodeJS.Timeout | null = null;
    private flushInterval: number = 5000;

    constructor() {
        if (typeof window !== 'undefined') {
            const interval = setInterval(() => this.flush(), this.flushInterval);
            this.flushTimeout = interval;
            window.addEventListener('beforeunload', () => this.flush());
        }
    }

    private async flush(): Promise<void> {
        if (this.logQueue.length === 0) return;

        const logsToSend = [...this.logQueue];
        this.logQueue = [];

        LogStorage.saveToStorage(logsToSend);

        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs: logsToSend }),
            });
        } catch (error) {
            console.error('Error sending logs to server:', error);
            this.logQueue = [...logsToSend, ...this.logQueue];
        }
    }

    log(entry: Omit<ApplicationLog, 'id' | 'context' | 'category'>): void {
        const context: LogContext = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        };

        const enhancedEntry: ApplicationLog = {
            ...entry,
            id: uuidv4(),
            context,
            category: 'application'
        };

        console.log(enhancedEntry);
        this.logQueue.push(enhancedEntry);

        if (this.logQueue.length >= 10) {
            this.flush();
        }
    }

    error(error: Error, metadata?: Record<string, unknown>): void {
        const context: LogContext = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
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

        this.logQueue.push(errorLog);
        this.flush();
    }
}

export const clientLogger = new ClientLogger();
