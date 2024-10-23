// lib/logger/types.ts
// STATUS: Modified version of your existing file - REPLACE
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
    timestamp: string;
    environment: string;
    component?: string;
    action?: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    url?: string;
    userAgent?: string;
};

export interface BaseLogEntry {
    id: string;
    level: LogLevel;
    message: string;
    context: LogContext;
    metadata?: Record<string, unknown>;
}

export interface SchemaResolutionLog extends BaseLogEntry {
    category: 'schema_resolution';
    resolutionType: 'table' | 'field' | 'cache';
    original: string;
    resolved: string;
    trace: string[];
}

export interface ErrorLog extends BaseLogEntry {
    category: 'error';
    error: {
        name: string;
        message: string;
        stack?: string;
    };
}

export interface ReduxLog extends BaseLogEntry {
    category: 'redux';
    action: {
        type: string;
        payload?: unknown;
    };
    prevState: unknown;
    nextState: unknown;
}

export interface ApplicationLog extends BaseLogEntry {
    category: 'application';
    subCategory?: 'api' | 'auth' | 'performance' | 'security' | 'system';
}

export type LogEntry =
    | SchemaResolutionLog
    | ErrorLog
    | ReduxLog
    | ApplicationLog;

