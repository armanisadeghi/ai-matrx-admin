// lib/logger/schema-logger.ts
import { v4 as uuidv4 } from 'uuid';
import { SchemaResolutionLog, LogLevel } from './types';
import { BaseLogger } from './base-logger';
import { LogStorage } from './storage';
import { logConfig } from './config';

export class SchemaLogger extends BaseLogger {
    private static instance: SchemaLogger;

    private constructor() {
        super();
    }

    static getInstance(): SchemaLogger {
        if (!SchemaLogger.instance) {
            SchemaLogger.instance = new SchemaLogger();
        }
        return SchemaLogger.instance;
    }

    /**
     * Logs schema resolution events
     * @param {Object} logDetails
     */
    logResolution(
        {
            resolutionType,
            original,
            resolved,
            message,
            level,
            trace,
            tableMetrics = undefined,  // Optional table metrics
        }: {
            resolutionType: 'table' | 'field' | 'cache' | 'database' | 'entity';
            original: string;
            resolved: string;
            message: string;
            level: LogLevel;
            trace: string[];
            tableMetrics?: {
                fieldCount?: number;
                variantCount?: number;
                size?: number;
            };
        }): void {
        const log: SchemaResolutionLog = {
            id: uuidv4(),
            category: 'schema_resolution',
            level,
            resolutionType,
            original,
            resolved,
            message,
            trace,
            context: {
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                component: 'SchemaLogger',
                action: 'Resolution',
            },
        };

        this.processLog(log);
    }

    /**
     * Process the log: store it and optionally send it to external services
     * @param {SchemaResolutionLog} log
     */
    protected async processLog(log: SchemaResolutionLog): Promise<void> {
        // Store schema logs separately in the schema log storage
        LogStorage.saveSchemaLogs([log]);

        // Optionally send logs to Datadog or any other monitoring service
        await this.sendToDatadog(log);

        // Output to the console if level meets the threshold
        this.consoleOutput(log);
    }
}

export const schemaLogger = SchemaLogger.getInstance();
