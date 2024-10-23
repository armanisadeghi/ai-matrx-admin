'use client';

import { clientLogger } from './client-logger';
import { ApplicationLog, ErrorLog } from './types';

interface NextJsLogEvent {
    type: 'build' | 'runtime' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
    stack?: string;
}

class NextJsLogger {
    private static instance: NextJsLogger;
    private originalConsole: typeof console;

    private constructor() {
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
            const logEntry: Omit<ApplicationLog, 'id' | 'context'> = {
                level: 'info',
                message: args.map(arg => this.stringify(arg)).join(' '),
                category: 'application',
                subCategory: 'console',
                metadata: { type: 'log', args }
            };
            clientLogger.log(logEntry);
        };

        console.error = (...args) => {
            this.originalConsole.error(...args);
            const errorEntry: Omit<ErrorLog, 'id' | 'context'> = {
                level: 'error',
                message: args.map(arg => this.stringify(arg)).join(' '),
                category: 'error',
                error: {
                    name: 'ConsoleError',
                    message: args.map(arg => this.stringify(arg)).join(' '),
                }
            };
            clientLogger.log(errorEntry);
        };

        console.warn = (...args) => {
            this.originalConsole.warn(...args);
            const logEntry: Omit<ApplicationLog, 'id' | 'context'> = {
                level: 'warn',
                message: args.map(arg => this.stringify(arg)).join(' '),
                category: 'application',
                subCategory: 'console',
                metadata: { type: 'warn', args }
            };
            clientLogger.log(logEntry);
        };
    }

    private interceptNextJsLogs() {
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                const errorEntry: Omit<ErrorLog, 'id' | 'context'> = {
                    level: 'error',
                    message: `Unhandled Promise Rejection: ${event.reason}`,
                    category: 'error',
                    error: {
                        name: 'UnhandledRejection',
                        message: String(event.reason),
                        stack: event.reason?.stack
                    }
                };
                clientLogger.log(errorEntry);
            });

            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.name.startsWith('Next.js')) {
                        const logEntry: Omit<ApplicationLog, 'id' | 'context'> = {
                            level: 'info',
                            message: `Next.js Performance: ${entry.name}`,
                            category: 'application',
                            subCategory: 'nextjs',
                            metadata: {
                                type: 'performance',
                                duration: entry.duration,
                                startTime: entry.startTime,
                                entryType: entry.entryType
                            }
                        };
                        clientLogger.log(logEntry);
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
}

export const nextJsLogger = NextJsLogger.getInstance();
