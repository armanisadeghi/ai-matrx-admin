// lib/redux/entity/entityLogger.ts

import {safeStringifyWithTimeout} from "@/utils/safeStringify";

type LogLevel = 'none' | 'debug' | 'info' | 'warn' | 'error';
type DetailLevel = 'minimal' | 'standard' | 'verbose';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    trace: string;
    entityKey: string;
    feature?: string;
    message: string;
    details?: any;
}

class EntityLogger {
    private static logs: LogEntry[] = [];
    private static subscribers: ((logs: LogEntry[]) => void)[] = [];
    private static logLevel: LogLevel = 'debug';
    private static consoleLogLevel: LogLevel = 'debug';
    private static detailLevel: DetailLevel = 'standard';
    private static featureFilter: Set<string> = new Set();
    private static duplicateSuppressionInterval = 500;

    private trace: string;
    private entityKey: string;

    private static lastLogEntry: LogEntry | null = null;
    private static lastLogTime: number | null = null;

    private static logLevelOrder: Record<LogLevel, number> = {
        'none': 0,
        'debug': 1,
        'info': 2,
        'warn': 3,
        'error': 4
    };

    private static logLevelColors: Record<LogLevel, string> = {
        'none': '',
        'debug': '\x1b[36m', // Cyan
        'info': '\x1b[32m', // Green
        'warn': '\x1b[33m', // Yellow
        'error': '\x1b[31m' // Red
    };

    private static resetColor = '\x1b[0m'; // Resets color

    constructor(trace: string = 'NoTrace', entityKey: string = 'NoEntity') {
        this.trace = trace;
        this.entityKey = entityKey;
    }

    static setLogLevel(level: LogLevel) {
        this.logLevel = level;
    }

    static setConsoleLogLevel(level: LogLevel) {
        this.consoleLogLevel = level;
    }

    static setDetailLevel(level: DetailLevel) {
        this.detailLevel = level;
    }

    static setFeatureFilter(features: string[]) {
        this.featureFilter = new Set(features);
    }

    static setDuplicateSuppressionInterval(interval: number) {
        this.duplicateSuppressionInterval = interval;
    }

    static createLoggerWithDefaults(trace: string, entityKey: string) {
        return new EntityLogger(trace, entityKey);
    }

    log(
        level: LogLevel,
        message: string,
        details?: any,
        traceOverride?: string,
        feature?: string
    ) {
        const trace = traceOverride || this.trace;
        const entityKey = this.entityKey;

        if (!EntityLogger.shouldLog(level, feature)) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            trace,
            entityKey,
            feature,
            message,
            details
        };

        // Check for duplicate log suppression
        if (EntityLogger.isDuplicateLog(entry)) {
            return;
        }

        EntityLogger.logs.unshift(entry);
        if (EntityLogger.logs.length > 100) EntityLogger.logs.pop();

        if (EntityLogger.shouldPrintToConsole(level, feature)) {
            EntityLogger.printToConsole(entry);
        }

        EntityLogger.notifySubscribers();

        // Update last log entry and time
        EntityLogger.lastLogEntry = entry;
        EntityLogger.lastLogTime = Date.now();
    }

    private static isDuplicateLog(entry: LogEntry): boolean {
        if (
            EntityLogger.lastLogEntry &&
            EntityLogger.lastLogTime &&
            Date.now() - EntityLogger.lastLogTime < EntityLogger.duplicateSuppressionInterval
        ) {
            const last = EntityLogger.lastLogEntry;
            return (
                last.level === entry.level &&
                last.trace === entry.trace &&
                last.entityKey === entry.entityKey &&
                last.message === entry.message &&
                JSON.stringify(last.details) === JSON.stringify(entry.details) &&
                last.feature === entry.feature
            );
        }
        return false;
    }

    private static printToConsole(entry: LogEntry) {
        const { trace, entityKey, feature, level } = entry;
        const color = this.logLevelColors[level] || '';
        const reset = this.resetColor;
    const message =
        typeof entry.message === 'object'
            ? safeStringifyWithTimeout(entry.message, 2, 5, 1000) // Explicitly passing arguments
            : entry.message;

    const details =
        typeof entry.details === 'object' && entry.details !== null
            ? safeStringifyWithTimeout(entry.details, 2, 5, 1000) // Explicitly passing arguments
            : entry.details;

        switch (this.detailLevel) {
            case 'minimal':
                // Color the message only
                console.log(`[${trace}] ${color}${message}${reset}`);
                break;

            case 'standard':
                // Color only the message and include details separately
                console.log(`[${trace}: ${entityKey}] ${color}${message}${reset}`);
                if (details !== undefined) {
                    console.log(`Details: ${color}${details}${reset}`);
                }
                break;

            case 'verbose':
                // Color the message and details individually
                console.log(`[${trace}: ${entityKey}] ${feature ? `[${feature}]` : ''}`);
                console.log(color + message + reset);
                if (details !== undefined) {
                    console.log(`Details: ${color}${details}${reset}`);
                    console.log('---');
                }
                break;

            default:
                // Default to color only the message
                console.log(`[${trace}] ${color}${message}${reset}`);
                break;
        }
    }

    private static shouldLog(level: LogLevel, feature?: string): boolean {
        return (
            this.logLevelOrder[level] >= this.logLevelOrder[this.logLevel] ||
            (feature && this.featureFilter.has(feature))
        );
    }

    private static shouldPrintToConsole(level: LogLevel, feature?: string): boolean {
        return (
            this.logLevelOrder[level] >= this.logLevelOrder[this.consoleLogLevel] ||
            (feature && this.featureFilter.has(feature))
        );
    }

    private static notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.logs));
    }

    static subscribe(callback: (logs: LogEntry[]) => void) {
        this.subscribers.push(callback);
        callback(this.logs);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    static clear() {
        this.logs = [];
        this.notifySubscribers();
    }
}

export default EntityLogger;
