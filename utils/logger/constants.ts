// lib/logger/constants.ts

export const LOG_LEVELS = {
    NONE: 'none',
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
} as const;

export const ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test'
} as const;
