// lib/logger/schema-logger.ts
import { v4 as uuidv4 } from 'uuid';
import { SchemaResolutionLog, LogLevel } from './types';
import { BaseLogger } from './base-logger';
import { LogStorage } from './storage';
import { logConfig } from './config';

export class SchemaLogger extends BaseLogger {
    private static instance: SchemaLogger;

    private constructor() {
        // Provide a unique identifier for this logger type
        super('schema-logger');
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
            tableMetrics = undefined,
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
        if (!this.shouldLog(level, 'schema', resolutionType)) {
            return;
        }

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
                environment: logConfig.environment,
                component: 'SchemaLogger',
                action: 'Resolution',
            },
        };

        // Store in base logger's storage
        this.addLog(log);

        // Store schema logs separately in the schema log storage
        LogStorage.saveSchemaLogs([log]);

        // Handle console output
        this.consoleOutput(log, 'SchemaLogger');

        // Process log (includes DataDog handling)
        this.processLog(log).catch(error => {
            console.error('Failed to process log:', error);
        });
    }

    /**
     * Process the log: store it and optionally send it to external services
     * @param {SchemaResolutionLog} log
     */
    protected async processLog(log: SchemaResolutionLog): Promise<void> {
        await super.processLog(log);
    }
}

// Export the singleton instance
export const schemaLogger = SchemaLogger.getInstance();
