// lib/logger/storage.ts

import { LogEntry, SchemaResolutionLog } from './types';
import { logConfig } from './config';

export class LogStorage {
    private static readonly APP_LOGS_KEY = 'app_logs';
    private static readonly SCHEMA_LOGS_KEY = 'schema_logs';
    private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

    static saveToStorage(logs: LogEntry[]): void {
        if (typeof window === 'undefined' || !logConfig.persistent) return;

        try {
            const existingLogs = this.getFromStorage();
            const combinedLogs = [...existingLogs, ...logs];
            
            // Keep only the most recent logs up to maxLogEntries
            const trimmedLogs = combinedLogs.slice(-logConfig.maxLogEntries);
            
            const serialized = JSON.stringify(trimmedLogs);
            if (serialized.length > this.MAX_STORAGE_SIZE) {
                // If we exceed storage size, keep only the most recent logs that fit
                const reducedLogs = trimmedLogs.slice(-Math.floor(logConfig.maxLogEntries / 2));
                localStorage.setItem(this.APP_LOGS_KEY, JSON.stringify(reducedLogs));
                console.warn('Log storage size exceeded, older logs removed');
            } else {
                localStorage.setItem(this.APP_LOGS_KEY, serialized);
            }
        } catch (error) {
            console.error('Error saving logs to storage:', error);
            this.clearStorage(); // Reset on error
        }
    }

    static saveSchemaLogs(logs: SchemaResolutionLog[]): void {
        if (typeof window === 'undefined' || !logConfig.persistent) return;

        try {
            const existingLogs = this.getSchemaLogs();
            const combinedLogs = [...existingLogs, ...logs];
            const trimmedLogs = combinedLogs.slice(-logConfig.maxLogEntries);

            const serialized = JSON.stringify(trimmedLogs);
            if (serialized.length > this.MAX_STORAGE_SIZE) {
                const reducedLogs = trimmedLogs.slice(-Math.floor(logConfig.maxLogEntries / 2));
                localStorage.setItem(this.SCHEMA_LOGS_KEY, JSON.stringify(reducedLogs));
                console.warn('Schema log storage size exceeded, older logs removed');
            } else {
                localStorage.setItem(this.SCHEMA_LOGS_KEY, serialized);
            }
        } catch (error) {
            console.error('Error saving schema logs to storage:', error);
            this.clearSchemaLogs(); // Reset on error
        }
    }

    static getFromStorage(): LogEntry[] {
        if (typeof window === 'undefined' || !logConfig.persistent) return [];

        try {
            const logs = localStorage.getItem(this.APP_LOGS_KEY);
            if (!logs) return [];

            const parsed = JSON.parse(logs);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error reading logs from storage:', error);
            this.clearStorage(); // Reset on error
            return [];
        }
    }

    static getSchemaLogs(): SchemaResolutionLog[] {
        if (typeof window === 'undefined' || !logConfig.persistent) return [];

        try {
            const logs = localStorage.getItem(this.SCHEMA_LOGS_KEY);
            if (!logs) return [];

            const parsed = JSON.parse(logs);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error reading schema logs from storage:', error);
            this.clearSchemaLogs(); // Reset on error
            return [];
        }
    }

    static clearStorage(): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(this.APP_LOGS_KEY);
        } catch (error) {
            console.error('Error clearing log storage:', error);
        }
    }

    static clearSchemaLogs(): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(this.SCHEMA_LOGS_KEY);
        } catch (error) {
            console.error('Error clearing schema log storage:', error);
        }
    }

    static getTotalStorageSize(): number {
        if (typeof window === 'undefined') return 0;
        try {
            const appLogs = localStorage.getItem(this.APP_LOGS_KEY) || '';
            const schemaLogs = localStorage.getItem(this.SCHEMA_LOGS_KEY) || '';
            return appLogs.length + schemaLogs.length;
        } catch {
            return 0;
        }
    }
}