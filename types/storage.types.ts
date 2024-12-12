// types/storage.types.ts

export type StorageSyncConfig = {
    slices: readonly string[];
    excludePaths: {
        readonly [key: string]: readonly string[];
    };
    debounceMs?: number;
    storagePrefix?: string;
};

export type StateUpdate = {
    sliceName: string;
    state: unknown;
    timestamp: number;
};

export const MANUAL_SAVE = 'storage/MANUAL_SAVE' as const;
export const SAVE_COMPLETE = 'storage/SAVE_COMPLETE' as const;

export type ManualSaveAction = {
    type: typeof MANUAL_SAVE;
    payload: {
        slice: string;
    };
};

export type SaveCompleteAction = {
    type: typeof SAVE_COMPLETE;
    payload: {
        slice: string;
        success: boolean;
    };
};

export const manualSave = (slice: string): ManualSaveAction => ({
    type: MANUAL_SAVE,
    payload: { slice }
});
