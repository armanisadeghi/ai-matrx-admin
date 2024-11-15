// lib/utils/callbackManager.ts

import { v4 as uuidv4 } from 'uuid';

export type Callback<T = any> = (data: T) => void;

class CallbackManager {
    private callbacks: Map<string, Callback>;

    constructor() {
        this.callbacks = new Map();
    }

    /**
     * Registers a callback and returns its unique ID.
     */
    register<T>(callback: Callback<T>): string {
        const callbackId = uuidv4();
        this.callbacks.set(callbackId, callback);
        return callbackId;
    }

    /**
     * Executes a callback by ID and removes it from the map.
     */
    trigger<T>(callbackId: string, data: T): void {
        const callback = this.callbacks.get(callbackId);
        if (callback) {
            callback(data);
            this.callbacks.delete(callbackId);
        }
    }

    /**
     * Removes a callback without triggering it.
     */
    remove(callbackId: string): void {
        this.callbacks.delete(callbackId);
    }
}

export const callbackManager = new CallbackManager();
