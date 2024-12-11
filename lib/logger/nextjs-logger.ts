// lib/logger/nextjs-logger.ts
'use client';

import { BaseLogger } from './base-logger';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationLog, ErrorLog, LogEntry } from './types';
import { logConfig } from './config';

interface NextJsLogEvent {
    type: 'build' | 'runtime' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
    stack?: string;
}

class NextJsLogger extends BaseLogger {
    private static instance: NextJsLogger;
    private originalConsole: typeof console;

    private constructor() {
        super('nextjs-logger');
        this.originalConsole = { ...console };
        this.interceptConsoleLogs();
        this.interceptNextJsLogs();
    }

    static getInstance(): NextJsLogger {
        if (!NextJsLogger.instance) {
            NextJsLogger.instance = new NextJsLogger();
        }
        return NextJsLogger.instance;
    }

    private interceptConsoleLogs() {
        console.log = (...args) => {
            this.originalConsole.log(...args);
            const logEntry: ApplicationLog = {
                id: uuidv4(),
                level: 'info',
                message: args.map(arg => this.stringify(arg)).join(' '),
                category: 'application',
                subCategory: 'console',
                context: {
                    timestamp: new Date().toISOString(),
                    environment: logConfig.environment,
                },
                metadata: { type: 'log', args }
            };
            this.addLog(logEntry);
            this.processLog(logEntry);
        };

        console.error = (...args) => {
            this.originalConsole.error(...args);
            const errorEntry: ErrorLog = {
                id: uuidv4(),
                level: 'error',
                message: args.map(arg => this.stringify(arg)).join(' '),
                category: 'error',
                context: {
                    timestamp: new Date().toISOString(),
                    environment: logConfig.environment,
                },
                error: {
                    name: 'ConsoleError',
                    message: args.map(arg => this.stringify(arg)).join(' '),
                }
            };
            this.addLog(errorEntry);
            this.processLog(errorEntry);
        };

        console.warn = (...args) => {
            this.originalConsole.warn(...args);
            const logEntry: ApplicationLog = {
                id: uuidv4(),
                level: 'warn',
                message: args.map(arg => this.stringify(arg)).join(' '),
                category: 'application',
                subCategory: 'console',
                context: {
                    timestamp: new Date().toISOString(),
                    environment: logConfig.environment,
                },
                metadata: { type: 'warn', args }
            };
            this.addLog(logEntry);
            this.processLog(logEntry);
        };
    }

    private interceptNextJsLogs() {
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                const errorEntry: ErrorLog = {
                    id: uuidv4(),
                    level: 'error',
                    message: `Unhandled Promise Rejection: ${event.reason}`,
                    category: 'error',
                    context: {
                        timestamp: new Date().toISOString(),
                        environment: logConfig.environment,
                    },
                    error: {
                        name: 'UnhandledRejection',
                        message: String(event.reason),
                        stack: event.reason?.stack
                    }
                };
                this.addLog(errorEntry);
                this.processLog(errorEntry);
            });

            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.name.startsWith('Next.js')) {
                        const logEntry: ApplicationLog = {
                            id: uuidv4(),
                            level: 'info',
                            message: `Next.js Performance: ${entry.name}`,
                            category: 'application',
                            subCategory: 'nextjs',
                            context: {
                                timestamp: new Date().toISOString(),
                                environment: logConfig.environment,
                            },
                            metadata: {
                                type: 'performance',
                                duration: entry.duration,
                                startTime: entry.startTime,
                                entryType: entry.entryType
                            }
                        };
                        this.addLog(logEntry);
                        this.processLog(logEntry);
                    }
                });
            });

            observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        }
    }

    private stringify(arg: any): string {
        if (typeof arg === 'string') return arg;
        try {
            return JSON.stringify(arg, null, 2);
        } catch {
            return String(arg);
        }
    }

    public restoreConsole() {
        Object.assign(console, this.originalConsole);
    }

    protected async processLog(log: LogEntry): Promise<void> {
        await super.processLog(log);
    }
}

export const nextJsLogger = NextJsLogger.getInstance();
