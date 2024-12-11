// lib/redux/sagas/storage/config.ts

export const storageSyncConfig = {
    slices: ['notes', 'tags'],
    excludePaths: {
        notes: ['loading', 'error', 'tempData'],
        tags: ['loading', 'error']
    },
    debounceMs: 2000,
    checkIntervalMs: 1000,
    storagePrefix: 'redux'
} as const;
