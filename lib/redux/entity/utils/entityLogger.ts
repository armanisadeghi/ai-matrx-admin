// lib/redux/entity/entityLogger.ts

import { ApplicationLog, BaseLogger, DetailLevel, logConfig, LogLevel, runtimeState } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

class EntityLogger extends BaseLogger {
    private readonly trace: string;
    private readonly entityKey: string;
    private readonly defaultFeature?: string;

    constructor(trace: string = 'NoTrace', entityKey: string = 'NoEntity', defaultFeature?: string) {
        super(`entity-${trace}-${entityKey}`);
        this.trace = trace;
        this.entityKey = entityKey;
        this.defaultFeature = defaultFeature;
    }

    static createLoggerWithDefaults(trace: string, entityKey: string, defaultFeature?: string): EntityLogger {
        return new EntityLogger(trace, entityKey, defaultFeature);
    }

    // Updated static methods for better level control
    static setLogLevel(level: LogLevel) {
        runtimeState.moduleOverrides.set('entity', level);
        console.log(`Entity log level set to: ${level}`);
    }

    static setConsoleLogLevel(level: LogLevel) {
        runtimeState.moduleOverrides.set('entity-console', level);
        console.log(`Entity console log level set to: ${level}`);
    }
    
    static disableLogging() {
        this.setLogLevel('none');
        this.setConsoleLogLevel('none');
    }

    static enableLogging(level: LogLevel = 'info') {
        this.setLogLevel(level);
        this.setConsoleLogLevel(level);
    }

    log(
        level: LogLevel = 'debug',
        message: string,
        details?: any,
        traceOverride?: string,
        feature?: string,
        detailLevel?: DetailLevel  // Add this parameter
    ): void {
        if (!message) {
            console.warn('EntityLogger: Empty message provided');
            return;
        }

        const trace = traceOverride || this.trace;
        const effectiveFeature = feature || this.defaultFeature;

        // Optimize performance in production/non-debug environments
        if (!logConfig.debug && level === 'debug') {
            return;
        }

        // Check both entity and entity-console log levels
        if (!this.shouldLog(level, 'entity', effectiveFeature) && !this.shouldLog(level, 'entity-console', effectiveFeature)) {
            return;
        }

        const structuredLog: ApplicationLog = {
            id: uuidv4(),
            level,
            message,
            category: 'application',
            subCategory: 'console',
            context: {
                timestamp: new Date().toISOString(),
                environment: logConfig.environment,
                component: trace,
                trace: [trace],
                feature: effectiveFeature,
                entityKey: this.entityKey,
            },
            metadata: details ? { details } : undefined,
        };

        this.addLog(structuredLog);
        this.consoleOutput(structuredLog, trace, this.entityKey);
        this.processLog(structuredLog).catch((error) => {
            console.error('Failed to process log:', error);
        });
    }
}

// Add window controls for console debugging
declare global {
    interface Window {
        entityLogger: {
            setLogLevel: (level: LogLevel) => void;
            setConsoleLogLevel: (level: LogLevel) => void;
            setDetailLevel: (level: DetailLevel) => void;
            disableLogging: () => void;
            enableLogging: (level?: LogLevel) => void;
        };
    }
}

if (typeof window !== 'undefined') {
    window.entityLogger = {
        setDetailLevel: (level: DetailLevel) => {
            console.log(`ENTITY LOGGER INITIALIZED | LOG LEVEL SET TO: ${level}`);
        },
        setLogLevel: EntityLogger.setLogLevel,
        setConsoleLogLevel: EntityLogger.setConsoleLogLevel,
        disableLogging: EntityLogger.disableLogging,
        enableLogging: EntityLogger.enableLogging,
    };
}

export default EntityLogger;

