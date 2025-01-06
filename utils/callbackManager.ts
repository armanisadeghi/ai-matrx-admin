import { v4 as uuidv4 } from 'uuid';

export type CallbackContext = Record<string, any>;

export interface ProgressInfo {
    progress?: number;
    status?: 'pending' | 'running' | 'completed' | 'error';
    error?: Error;
}

export type Callback<T = any, C extends CallbackContext = CallbackContext> = 
    (data: T, context?: C) => void;

interface CallbackEntry<T = any, C extends CallbackContext = CallbackContext> {
    callback: Callback<T, C>;
    context?: C;
    groupId?: string;
}

class CallbackManager {
    private callbacks: Map<string, CallbackEntry>;
    private groups: Map<string, Set<string>>;

    constructor() {
        this.callbacks = new Map();
        this.groups = new Map();
    }

    /**
     * Original method - maintains backwards compatibility
     */
    register<T>(callback: Callback<T>): string {
        const callbackId = uuidv4();
        this.callbacks.set(callbackId, { callback });
        return callbackId;
    }

    /**
     * Enhanced register with optional context and group support
     */
    registerWithContext<T, C extends CallbackContext = CallbackContext>(
        callback: Callback<T, C>,
        options?: {
            context?: C;
            groupId?: string;
        }
    ): string {
        const callbackId = uuidv4();
        const { context, groupId } = options || {};
        
        this.callbacks.set(callbackId, { callback, context, groupId });
        
        if (groupId) {
            const group = this.groups.get(groupId) || new Set();
            group.add(callbackId);
            this.groups.set(groupId, group);
        }
        
        return callbackId;
    }

    /**
     * Original method - maintains backwards compatibility
     */
    trigger<T>(callbackId: string, data: T): void {
        const entry = this.callbacks.get(callbackId);
        if (entry) {
            entry.callback(data);
            this.callbacks.delete(callbackId);
            this.removeFromGroups(callbackId);
        }
    }

    /**
     * Enhanced trigger with context and progress support
     */
    triggerWithContext<T, C extends CallbackContext = CallbackContext>(
        callbackId: string,
        data: T,
        options?: {
            context?: C;
            progress?: ProgressInfo;
            removeAfterTrigger?: boolean;
        }
    ): void {
        const entry = this.callbacks.get(callbackId);
        if (entry) {
            const mergedContext = {
                ...entry.context,
                ...options?.context,
                ...(options?.progress && { progress: options.progress })
            } as C;

            entry.callback(data, mergedContext);

            if (options?.removeAfterTrigger !== false) {
                this.callbacks.delete(callbackId);
                this.removeFromGroups(callbackId);
            }
        }
    }

    /**
     * Trigger all callbacks in a group
     */
    triggerGroup<T, C extends CallbackContext = CallbackContext>(
        groupId: string,
        data: T,
        options?: {
            context?: C;
            progress?: ProgressInfo;
            removeAfterTrigger?: boolean;
        }
    ): void {
        const group = this.groups.get(groupId);
        if (group) {
            group.forEach(callbackId => {
                this.triggerWithContext(callbackId, data, options);
            });
            
            if (options?.removeAfterTrigger !== false) {
                this.groups.delete(groupId);
            }
        }
    }

    /**
     * Update progress for a callback or group
     */
    updateProgress(
        id: string,
        progress: number,
        options?: {
            status?: ProgressInfo['status'];
            error?: Error;
            groupId?: boolean;
        }
    ): void {
        const progressInfo: ProgressInfo = {
            progress,
            status: options?.status || 'running',
            error: options?.error
        };

        if (options?.groupId) {
            this.triggerGroup(id, null, { 
                progress: progressInfo,
                removeAfterTrigger: false 
            });
        } else {
            this.triggerWithContext(id, null, { 
                progress: progressInfo,
                removeAfterTrigger: false 
            });
        }
    }

    /**
     * Create a new group and return its ID
     */
    createGroup(): string {
        const groupId = uuidv4();
        this.groups.set(groupId, new Set());
        return groupId;
    }

    /**
     * Original method - maintains backwards compatibility
     */
    remove(callbackId: string): void {
        this.callbacks.delete(callbackId);
        this.removeFromGroups(callbackId);
    }

    /**
     * Remove a group and all its callbacks
     */
    removeGroup(groupId: string): void {
        const group = this.groups.get(groupId);
        if (group) {
            group.forEach(callbackId => {
                this.callbacks.delete(callbackId);
            });
            this.groups.delete(groupId);
        }
    }

    private removeFromGroups(callbackId: string): void {
        const entry = this.callbacks.get(callbackId);
        if (entry?.groupId) {
            const group = this.groups.get(entry.groupId);
            group?.delete(callbackId);
            if (group?.size === 0) {
                this.groups.delete(entry.groupId);
            }
        }
    }
}

export const callbackManager = new CallbackManager();