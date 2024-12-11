// lib/redux/sagas/storage/types.ts

export type StorageSyncConfig = {
    slices: readonly string[];
    excludePaths: {
        readonly [key: string]: readonly string[];
    };
    debounceMs?: number;
    checkIntervalMs?: number;
    storagePrefix?: string;
};

export type StateUpdate = {
    sliceName: string;
    state: unknown;
    timestamp: number;
};
