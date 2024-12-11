// lib/logger/config.ts
import { LogLevel, DetailLevel } from "@/lib/logger/types";

export const logConfig = {
    environment: process.env.NODE_ENV || 'development',
    service: process.env.SERVICE_NAME || 'next-app',
    debug: process.env.NODE_ENV === 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    consoleLogLevel: process.env.CONSOLE_LOG_LEVEL || 'none',
    detailLevel: process.env.DETAIL_LEVEL || 'standard',
    console: true,
    duplicateSuppressionInterval: 500,
    maxLogEntries: 100,
    serverLogEndpoint: '/api/logs',
    batchSize: 10,
    flushInterval: 5000,
    persistent: true,
    datadog: {
        enabled: process.env.DATADOG_ENABLED === 'true',
        apiKey: process.env.DATADOG_API_KEY,
        appKey: process.env.DATADOG_APP_KEY,
        site: process.env.DATADOG_SITE || 'datadoghq.com'
    }
};

export const runtimeState = {
    featureFilter: new Set<string>(),
    moduleOverrides: new Map<string, LogLevel>(),
    lastLogTime: null as number | null,
    lastLogMessage: null as string | null,
};

export const LOG_LEVEL_MAPPING = {
    'debug': 1,
    'info': 2,
    'warn': 3,
    'error': 4,
    'none': 10,
} as const;

export const LOG_COLORS = {
    'none': '',
    'debug': '\x1b[36m', // Cyan
    'info': '\x1b[32m',  // Green
    'warn': '\x1b[33m',  // Yellow
    'error': '\x1b[31m'  // Red
} as const;

export const RESET_COLOR = '\x1b[0m';

export const DEFAULT_VALUES = {
    environment: 'development',
    logLevel: 'info',
    consoleLogLevel: 'none',
    detailLevel: 'standard',
    datadogSite: 'datadoghq.com',
    maxLogEntries: 100,
    duplicateSuppressionInterval: 500
} as const;
