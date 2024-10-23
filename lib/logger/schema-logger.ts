// lib/logger/schema-logger.ts
// STATUS: Modified version of your utils/schema/schema-logger.ts - REPLACE
import { v4 as uuidv4 } from 'uuid';
import { SchemaResolutionLog } from './types';
import { BaseLogger } from './base-logger';
import { LogStorage } from './storage';

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

    logResolution({
                      resolutionType,
                      original,
                      resolved,
                      message,
                      level,
                      trace
                  }: {
        resolutionType: 'table' | 'field' | 'cache';
        original: string;
        resolved: string;
        message: string;
        level: 'info' | 'warn';
        trace: string[];
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
            }
        };

        this.processLog(log);
    }

    protected async processLog(log: SchemaResolutionLog): Promise<void> {
        // Store schema logs separately
        LogStorage.saveSchemaLogs([log]);

        // Send to Datadog if enabled
        await this.sendToDatadog(log);

        // Console output in development
        if (process.env.NODE_ENV === 'development') {
            this.consoleOutput(log);
        }
    }
}

export const schemaLogger = SchemaLogger.getInstance();
