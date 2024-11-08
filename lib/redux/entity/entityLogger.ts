// lib/redux/entity/entityLogger.ts
type LogLevel = 'info' | 'warning' | 'error' | 'debug';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    entityKey?: string;
    message: string;
    details?: any;
}

class EntityLogger {
    private static logs: LogEntry[] = [];
    private static subscribers: ((logs: LogEntry[]) => void)[] = [];
    private static logLevel: LogLevel = 'info'; // Default log level

    // Define precedence for log levels
    private static logLevelOrder: Record<LogLevel, number> = {
        'debug': 0,
        'info': 1,
        'warning': 2,
        'error': 3
    };

    // Method to set the log level
    static setLogLevel(level: LogLevel) {
        this.logLevel = level;
    }

    static log(level: LogLevel, message: string, entityKey?: string, details?: any) {
        if (this.logLevelOrder[level] < this.logLevelOrder[this.logLevel]) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            entityKey,
            message,
            details
        };

        console.log(`[${level.toUpperCase()}]${entityKey ? ` [${entityKey}]` : ''}: ${message}`, details || '');

        this.logs.unshift(entry);
        if (this.logs.length > 100) this.logs.pop(); // Keep last 100 logs

        this.notifySubscribers();
    }

    static subscribe(callback: (logs: LogEntry[]) => void) {
        this.subscribers.push(callback);
        callback(this.logs);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    private static notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.logs));
    }

    static clear() {
        this.logs = [];
        this.notifySubscribers();
    }
}

export default EntityLogger;
