import { EventEmitter } from 'events';

interface DebugEvent {
    operation: string;
    data: unknown;
    error?: unknown;
    duration: number;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

class StorageDebugger extends EventEmitter {
    private static instance: StorageDebugger;

    private constructor() {
        super();
    }

    static getInstance(): StorageDebugger {
        if (!StorageDebugger.instance) {
            StorageDebugger.instance = new StorageDebugger();
        }
        return StorageDebugger.instance;
    }

    logOperation(event: DebugEvent): void {
        this.emit('operation', event);
    }
}

export default StorageDebugger;