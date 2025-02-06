// lib/logger/config.ts
import { LogLevel } from '@/utils/logger';

export const runtimeState = {
    featureFilter: new Set<string>(),
    moduleOverrides: new Map<string, LogLevel>(),
    lastLogTime: null as number | null,
    lastLogMessage: null as string | null,
};

export const LOG_LEVEL_MAPPING = {
    'none': 0,
    'error': 1,   // Most important
    'warn': 2,
    'info': 3,
    'debug': 4    // Most verbose
} as const;


export const LOG_COLORS = {
    none: '',
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m', // Green
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
} as const;

export const RESET_COLOR = '\x1b[0m';

export const DEFAULT_VALUES = {
    environment: 'development',
    logLevel: 'info',
    consoleLogLevel: 'info',
    detailLevel: 'verbose',
    datadogSite: 'datadoghq.com',
    maxLogEntries: 100,
    duplicateSuppressionInterval: 500,
} as const;

// Update the resolveLogLevel function
export function resolveLogLevel(
    envLevel: string | undefined,
    defaultLevel: LogLevel,
    consoleLevel: LogLevel
): { level: LogLevel; source: string } {
    let resolvedLevel = defaultLevel;

    if (envLevel) {
        const envLevelTyped = envLevel as LogLevel;

        // Take the most verbose setting (higher number) between envLevel and defaultLevel
        if (LOG_LEVEL_MAPPING[envLevelTyped] > LOG_LEVEL_MAPPING[defaultLevel]) {
            resolvedLevel = envLevelTyped;
        }
    }

    // Ensure resolved logLevel is at least as verbose as the consoleLogLevel
    if (LOG_LEVEL_MAPPING[consoleLevel] > LOG_LEVEL_MAPPING[resolvedLevel]) {
        resolvedLevel = consoleLevel;
    }

    return {
        level: resolvedLevel,
        source: envLevel ? '.env' : 'config',
    };
}

// Update the logConfig initialization
const resolvedConsoleLevel = resolveLogLevel(
    process.env.CONSOLE_LOG_LEVEL,
    DEFAULT_VALUES.consoleLogLevel,
    DEFAULT_VALUES.consoleLogLevel // Default comparison base
);

const resolvedLogLevel = resolveLogLevel(
    process.env.LOG_LEVEL,
    DEFAULT_VALUES.logLevel,
    resolvedConsoleLevel.level // Pass the resolved console log level for comparison
);

export const logConfig = {
    environment: process.env.NODE_ENV || DEFAULT_VALUES.environment,
    service: process.env.SERVICE_NAME || 'next-app',
    debug: process.env.NODE_ENV === 'development',
    logLevel: resolvedLogLevel.level, // Updated logLevel
    consoleLogLevel: resolvedConsoleLevel.level,
    detailLevel: process.env.DETAIL_LEVEL || DEFAULT_VALUES.detailLevel,
    console: process.env.NODE_ENV === 'development' && resolvedConsoleLevel.level !== 'none',
    duplicateSuppressionInterval: DEFAULT_VALUES.duplicateSuppressionInterval,
    maxLogEntries: DEFAULT_VALUES.maxLogEntries,
    serverLogEndpoint: '/api/logs',
    batchSize: 10,
    flushInterval: 5000,
    persistent: true,
    datadog: {
        enabled: process.env.DATADOG_ENABLED === 'true',
        apiKey: process.env.DATADOG_API_KEY,
        appKey: process.env.DATADOG_APP_KEY,
        site: process.env.DATADOG_SITE || DEFAULT_VALUES.datadogSite,
    },
} as const;
