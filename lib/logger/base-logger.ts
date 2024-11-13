// lib/logger/base-logger.ts
import { LogEntry, LogLevel } from './types';
import { logConfig } from './config';

const logLevelMapping: { [key in LogLevel]: number } = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'error': 3,
};

export abstract class BaseLogger {
    protected abstract processLog(log: LogEntry): Promise<void>;

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

    protected consoleOutput(log: LogEntry): void {
        // Restrict console logging to the development environment
        if (logConfig.environment !== 'development') return;

        // Check if log level meets the console output threshold
        const logLevelThreshold = logLevelMapping[logConfig.consoleLogLevel || 'info'];
        if (logLevelMapping[log.level] < logLevelThreshold) {
            return; // Do not log if below threshold
        }

        const logMethod = log.level === 'error' ? console.error :
                          log.level === 'warn' ? console.warn :
                          log.level === 'debug' ? console.debug :
                          console.log;

        logMethod(`[${log.category}] ${log.message}`, log);
    }
}
