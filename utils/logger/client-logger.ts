// lib/logger/client-logger.ts
'use client';

import { BaseLogger } from './base-logger';
import { v4 as uuidv4 } from 'uuid';
import { LogStorage } from './storage';
import { LogEntry, LogContext, ApplicationLog } from './types';
import { logConfig } from './config';

class ClientLogger extends BaseLogger {
    private logQueue: LogEntry[] = [];
    private flushTimeout: NodeJS.Timeout | null = null;

    constructor() {
        super('client-logger');
        if (typeof window !== 'undefined') {
            this.flushTimeout = setInterval(() => this.flush(), logConfig.flushInterval);
            window.addEventListener('beforeunload', () => this.flush());
        }
    }

    private async flush(): Promise<void> {
        if (this.logQueue.length === 0) return;

        const logsToSend = [...this.logQueue];
        this.logQueue = [];

        // Store logs locally
        LogStorage.saveToStorage(logsToSend);

        try {
            await fetch(logConfig.serverLogEndpoint, {
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
            environment: logConfig.environment,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        };

        const enhancedEntry: ApplicationLog = {
            ...entry,
            id: uuidv4(),
            context,
            category: 'application'
        };

        // Add to base logger storage and handle console output
        this.addLog(enhancedEntry);
        this.consoleOutput(enhancedEntry);

        // Queue for server sending
        this.logQueue.push(enhancedEntry);
        if (this.logQueue.length >= logConfig.batchSize) {
            this.flush();
        }
    }

    error(error: Error, metadata?: Record<string, unknown>): void {
        const context: LogContext = {
            timestamp: new Date().toISOString(),
            environment: logConfig.environment,
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

        // Add to base logger storage and handle console output
        this.addLog(errorLog);
        this.consoleOutput(errorLog);

        // Queue for immediate sending
        this.logQueue.push(errorLog);
        this.flush();
    }

    protected async processLog(log: LogEntry): Promise<void> {
        // Client logger handles its own sending via flush()
        // but we'll still use base DataDog integration if enabled
        await super.processLog(log);
    }
}

export const clientLogger = new ClientLogger();