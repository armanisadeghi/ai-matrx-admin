// lib/redux/sagas/storage/storageSyncSaga.ts
'use client';

import { select, call, fork, put, takeLatest, delay } from 'redux-saga/effects';
import { StorageSyncConfig } from './types';
import { storageManager } from './storageManager';
import { RootState } from '@/lib/redux/store';

export function createStorageSyncSaga(config: StorageSyncConfig) {
    const {
        slices,
        excludePaths,
        debounceMs = 2000,
        storagePrefix = 'redux'
    } = config;

    function* saveSliceState(sliceName: string, state: unknown) {
        try {
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

            if (!result.success) {
                console.warn(`Storage sync failed for ${sliceName}:`, result.message);
            }
        } catch (error) {
            console.warn(`Storage sync error for ${sliceName}:`, error);
        }
    }

    function* watchSliceActions() {
        for (const slice of slices) {
            yield takeLatest(
                (action): action is any =>
                    action.type.startsWith(`${slice}/`) &&
                    !action.type.endsWith('/initialize'),
                function* (action) {
                    yield delay(debounceMs);
                    const state = yield select((state: RootState) => state[slice]);
                    yield call(saveSliceState, slice, state);
                }
            );
        }
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
