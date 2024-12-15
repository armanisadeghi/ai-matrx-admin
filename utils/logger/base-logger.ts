// lib/logger/base-logger.ts
import { LogEntry, LogLevel, DetailLevel } from './types';
import {
    logConfig,
    runtimeState,
    LOG_LEVEL_MAPPING,
    LOG_COLORS,
    RESET_COLOR
} from './config';

export abstract class BaseLogger {
    protected static logStorage = new Map<string, LogEntry[]>();
    protected static subscribers = new Map<string, ((logs: LogEntry[]) => void)[]>();
    protected loggerId: string;

    constructor(loggerId: string) {
        this.loggerId = loggerId;
        if (!BaseLogger.logStorage.has(loggerId)) {
            BaseLogger.logStorage.set(loggerId, []);
            BaseLogger.subscribers.set(loggerId, []);
        }
    }

    // Feature filter management
    static setFeatureFilter(features: string[]) {
        runtimeState.featureFilter = new Set(features);
    }

    static addFeatureToFilter(feature: string) {
        runtimeState.featureFilter.add(feature);
    }

    static removeFeatureFromFilter(feature: string) {
        runtimeState.featureFilter.delete(feature);
    }

    // Module override management
    static setModuleLogLevel(module: string, level: LogLevel) {
        runtimeState.moduleOverrides.set(module, level);
    }

    static clearModuleLogLevel(module: string) {
        runtimeState.moduleOverrides.delete(module);
    }

    protected isDuplicateLog(message: string): boolean {
        const now = Date.now();
        if (runtimeState.lastLogTime &&
            runtimeState.lastLogMessage === message &&
            now - runtimeState.lastLogTime < logConfig.duplicateSuppressionInterval) {
            return true;
        }
        runtimeState.lastLogTime = now;
        runtimeState.lastLogMessage = message;
        return false;
    }

    protected shouldLog(level: LogLevel, module?: string, feature?: string): boolean {
        // Check module override first
        if (module && runtimeState.moduleOverrides.has(module)) {
            const moduleLevel = runtimeState.moduleOverrides.get(module)!;
            return LOG_LEVEL_MAPPING[level] >= LOG_LEVEL_MAPPING[moduleLevel];
        }

        // Check feature filter
        if (feature && runtimeState.featureFilter.has(feature)) {
            return true;
        }

        // Fall back to global log level
        return LOG_LEVEL_MAPPING[level] >= LOG_LEVEL_MAPPING[logConfig.logLevel];
    }

    protected consoleOutput(log: LogEntry, trace?: string, entityKey?: string): void {
        if (!logConfig.console || logConfig.consoleLogLevel === 'none') return;
        if (logConfig.environment !== 'development') return;

        const color = LOG_COLORS[log.level] || LOG_COLORS.info;
        const message = typeof log.message === 'string' ? log.message : JSON.stringify(log.message);
        const details = log.metadata ? JSON.stringify(log.metadata, null, 2) : '';

        switch (logConfig.detailLevel) {
            case 'minimal':
                console.log(`[${trace || log.context?.component || ''}] ${color}${message}${RESET_COLOR}`);
                break;
            case 'standard':
                console.log(
                    `[${trace || log.context?.component || ''}${entityKey ? ': ' + entityKey : ''}] ${color}${message}${RESET_COLOR}`
                );
                if (details) {
                    console.log(`${color}${details}${RESET_COLOR}`);
                }
                break;
            case 'verbose':
                console.log(`[${trace || log.context?.component || ''}${entityKey ? ': ' + entityKey : ''}]`);
                console.log(color + message + RESET_COLOR);
                if (details) {
                    console.log(`${color}${details}${RESET_COLOR}`);
                    console.log('---');
                }
                break;
        }
    }

    protected async sendToDatadog(log: LogEntry): Promise<void> {
        if (!logConfig.datadog.enabled || !logConfig.datadog.apiKey) return;

        try {
            await fetch(`https://http-intake.logs.${logConfig.datadog.site}/api/v2/logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'DD-API-KEY': logConfig.datadog.apiKey
                },
                body: JSON.stringify([{
                    ...log,
                    ddsource: 'nodejs',
                    service: logConfig.service,
                    ddtags: `env:${logConfig.environment}`
                }])
            });
        } catch (error) {
            console.error('Failed to send log to Datadog:', error);
        }
    }

    protected addLog(log: LogEntry): void {
        const logs = BaseLogger.logStorage.get(this.loggerId) || [];
        logs.unshift(log);
        if (logs.length > logConfig.maxLogEntries) {
            logs.pop();
        }
        BaseLogger.logStorage.set(this.loggerId, logs);
        this.notifySubscribers();
    }

    protected notifySubscribers(): void {
        const subscribers = BaseLogger.subscribers.get(this.loggerId) || [];
        const logs = BaseLogger.logStorage.get(this.loggerId) || [];
        subscribers.forEach(callback => callback(logs));
    }

    subscribe(callback: (logs: LogEntry[]) => void): () => void {
        const subscribers = BaseLogger.subscribers.get(this.loggerId) || [];
        subscribers.push(callback);
        BaseLogger.subscribers.set(this.loggerId, subscribers);

        const logs = BaseLogger.logStorage.get(this.loggerId) || [];
        callback(logs);

        return () => {
            const currentSubscribers = BaseLogger.subscribers.get(this.loggerId) || [];
            BaseLogger.subscribers.set(
                this.loggerId,
                currentSubscribers.filter(cb => cb !== callback)
            );
        };
    }

    clear(): void {
        BaseLogger.logStorage.set(this.loggerId, []);
        this.notifySubscribers();
    }

    protected async processLog(log: LogEntry): Promise<void> {
        await this.sendToDatadog(log);
    }
}
