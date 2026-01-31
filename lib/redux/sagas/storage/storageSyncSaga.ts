// lib/redux/sagas/storage/storageSyncSaga.ts
'use client';

import { select, call, fork, put, takeLatest, takeEvery, delay } from 'redux-saga/effects';
import { StorageSyncConfig, MANUAL_SAVE, ManualSaveAction, SAVE_COMPLETE } from '@/types/storage.types';
import { storageManager } from './storageManager';
import { RootState } from '@/lib/redux/store';
import { toast } from '@/lib/toast-service';

// console.log('Creating storage sync saga');

export function createStorageSyncSaga(config: StorageSyncConfig) {
    const {
        slices,
        excludePaths,
        debounceMs = 2000,
        storagePrefix = 'redux'
    } = config;

    // Register toast defaults for storage operations
    toast.registerDefaults('storage', {
        success: "Changes saved successfully",
        error: "Failed to save changes",
        info: "Saving changes..."
    });

    function* saveSliceState(sliceName: string, state: unknown, isManual = false) {
        try {
            if (isManual) {
                toast.info("Saving changes...", 'storage');
            }

            const filteredState = excludeStateProps(
                state,
                excludePaths[sliceName] ?? []
            );

            const result = yield call(
                [storageManager, storageManager.setItem],
                storagePrefix,
                sliceName,
                'state',
                filteredState
            );

            if (result.success) {
                if (isManual) {
                    toast.success(`${sliceName} saved successfully`);
                    yield put({
                        type: SAVE_COMPLETE,
                        payload: { slice: sliceName, success: true }
                    });
                }
            } else {
                if (isManual) {
                    toast.error(`Failed to save ${sliceName}`);
                    yield put({
                        type: SAVE_COMPLETE,
                        payload: { slice: sliceName, success: false }
                    });
                }
                console.warn(`Storage sync failed for ${sliceName}:`, result.message);
            }
        } catch (error) {
            if (isManual) {
                toast.error(`Error saving ${sliceName}`);
                yield put({
                    type: SAVE_COMPLETE,
                    payload: { slice: sliceName, success: false }
                });
            }
            console.warn(`Storage sync error for ${sliceName}:`, error);
        }
    }

    function* handleManualSave(action: ManualSaveAction) {
        console.log('Handling manual save', action);
        const { slice } = action.payload;
        if (slices.includes(slice)) {
            console.log('Slice found, proceeding with save');
            const state = yield select((state: RootState) => state[slice]);
            yield call(saveSliceState, slice, state, true);
        }
    }

    function* watchSliceActions() {
        for (const slice of slices) {
            yield takeLatest(
                (action: any): action is any =>
                    action.type.startsWith(`${slice}/`) &&
                    !action.type.endsWith('/initialize') &&
                    action.type !== MANUAL_SAVE &&
                    action.type !== SAVE_COMPLETE,
                function* (action) {
                    yield delay(debounceMs);
                    const state = yield select((state: RootState) => state[slice]);
                    yield call(saveSliceState, slice, state, false);
                }
            );
        }

        yield takeEvery(MANUAL_SAVE, handleManualSave);
    }

    function* initializeStorage() {
        try {
            for (const slice of slices) {
                const storedState = yield call(
                    [storageManager, storageManager.getItem],
                    storagePrefix,
                    slice,
                    'state'
                );

                if (storedState) {
                    yield put({
                        type: `${slice}/initialize`,
                        payload: storedState
                    });
                }
            }
        } catch (error) {
            console.warn('Storage initialization failed:', error);
        }
    }

    function excludeStateProps(state: unknown, excludePaths: readonly string[]): unknown {
        if (!excludePaths.length || typeof state !== 'object' || !state) {
            return state;
        }

        const result = { ...state as object };

        for (const path of excludePaths) {
            const parts = path.split('.');
            let current: any = result;

            for (let i = 0; i < parts.length - 1; i++) {
                if (current[parts[i]]) {
                    current = current[parts[i]];
                }
            }

            delete current[parts[parts.length - 1]];
        }

        return result;
    }

    return function* storageSyncSaga() {
        yield call(initializeStorage);
        yield fork(watchSliceActions);
    };
}
