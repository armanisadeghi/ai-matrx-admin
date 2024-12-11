// lib/redux/entity/entityLogger.ts
import { BaseLogger } from "@/lib/logger/base-logger";
import { ApplicationLog, LogLevel, DetailLevel } from "@/lib/logger/types";
import { logConfig, runtimeState } from "@/lib/logger/config";
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

    static setLogLevel(level: LogLevel) {
        runtimeState.moduleOverrides.set('entity', level);
    }

    static setConsoleLogLevel(level: LogLevel) {
        runtimeState.moduleOverrides.set('entity-console', level);
    }

    static setDetailLevel(level: DetailLevel) {
        logConfig.detailLevel = level;
    }

    log(
        level: LogLevel,
        message: string,
        details?: any,
        traceOverride?: string,
        feature?: string
    ): void {
        const trace = traceOverride || this.trace;
        const effectiveFeature = feature || this.defaultFeature;

        if (!this.shouldLog(level, 'entity', effectiveFeature)) {
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
                entityKey: this.entityKey
            },
            metadata: details ? { details } : undefined
        };

        this.addLog(structuredLog);
        this.consoleOutput(structuredLog, trace, this.entityKey);
        this.processLog(structuredLog).catch(error => {
            console.error('Failed to process log:', error);
        });
    }
}

export default EntityLogger;
