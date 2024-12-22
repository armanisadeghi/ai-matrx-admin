import { EventEmitter } from 'events';

interface DebugEvent {
    operation: string;
    request: unknown;
    response: unknown;
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

    logOperation(operation: string, request: unknown, response: unknown): void {
        const event: DebugEvent = { operation, request, response };
        this.emit('operation', event);
    }
}

export default StorageDebugger;
