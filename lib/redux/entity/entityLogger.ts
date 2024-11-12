// lib/redux/entity/entityLogger.ts
type LogLevel = 'debug' | 'info' | 'warning' | 'error' ;

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
    private static logLevel: LogLevel = 'info';

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

        let processedDetails = details;
        try {
            if (typeof details === 'object' && details !== null) {
                processedDetails = JSON.parse(JSON.stringify(details)); // Deep copy to avoid Proxy issues
            }
        } catch (error) {
            processedDetails = `Unable to serialize details: ${error.message}`;
        }

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            entityKey,
            message,
            details: processedDetails
        };

        console.log(`[${level.toUpperCase()}]${entityKey ? ` [${entityKey}]` : ''}: ${message}`, processedDetails || '');

        this.logs.unshift(entry);
        if (this.logs.length > 100) this.logs.pop();

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

    static shouldLog(level: LogLevel): boolean {
        return this.logLevelOrder[level] >= this.logLevelOrder[this.logLevel];
    }
}

export default EntityLogger;
