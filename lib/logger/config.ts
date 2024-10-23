// lib/logger/config.ts
// STATUS: Modified version of your existing file - REPLACE
import { ENVIRONMENTS } from './constants';

export const logConfig = {
    environment: process.env.NODE_ENV || 'development',
    service: process.env.SERVICE_NAME || 'next-app',
    debug: process.env.NODE_ENV === 'development',
    serverLogEndpoint: '/api/logs',
    batchSize: 10,
    flushInterval: 5000,
    persistent: true,
    console: true,
    datadog: {
        enabled: process.env.DATADOG_ENABLED === 'true',
        apiKey: process.env.DATADOG_API_KEY,
        appKey: process.env.DATADOG_APP_KEY,
        site: process.env.DATADOG_SITE || 'datadoghq.com'
    }
};
