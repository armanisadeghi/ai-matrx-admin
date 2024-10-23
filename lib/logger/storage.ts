// lib/logger/storage.ts
// STATUS: Modified version of your existing file - REPLACE
import { LogEntry, SchemaResolutionLog } from './types';

export class LogStorage {
    private static readonly APP_LOGS_KEY = 'app_logs';
    private static readonly SCHEMA_LOGS_KEY = 'schema_logs';

    static saveToStorage(logs: LogEntry[]): void {
        if (typeof window === 'undefined') return;

        try {
            const existingLogs = this.getFromStorage();
            localStorage.setItem(
                this.APP_LOGS_KEY,
                JSON.stringify([...existingLogs, ...logs])
            );
        } catch (error) {
            console.error('Error saving logs to storage:', error);
        }
    }

    static saveSchemaLogs(logs: SchemaResolutionLog[]): void {
        if (typeof window === 'undefined') return;

        try {
            const existingLogs = this.getSchemaLogs();
            localStorage.setItem(
                this.SCHEMA_LOGS_KEY,
                JSON.stringify([...existingLogs, ...logs])
            );
        } catch (error) {
            console.error('Error saving schema logs to storage:', error);
        }
    }

    static getFromStorage(): LogEntry[] {
        if (typeof window === 'undefined') return [];

        try {
            const logs = localStorage.getItem(this.APP_LOGS_KEY);
            return logs ? JSON.parse(logs) : [];
        } catch (error) {
            console.error('Error reading logs from storage:', error);
            return [];
        }
    }

    static getSchemaLogs(): SchemaResolutionLog[] {
        if (typeof window === 'undefined') return [];

        try {
            const logs = localStorage.getItem(this.SCHEMA_LOGS_KEY);
            return logs ? JSON.parse(logs) : [];
        } catch (error) {
            console.error('Error reading schema logs from storage:', error);
            return [];
        }
    }

    static clearStorage(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.APP_LOGS_KEY);
    }

    static clearSchemaLogs(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.SCHEMA_LOGS_KEY);
    }
}
