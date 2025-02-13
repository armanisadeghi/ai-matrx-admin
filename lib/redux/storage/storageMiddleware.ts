import { Middleware } from '@reduxjs/toolkit';
import { UnknownAction } from 'redux';
import StorageManager from '@/utils/supabase/StorageManager';
import type { StorageState } from './types';
import _ from 'lodash';

const throttledStorageOperations = _.throttle((storage: StorageManager, payload: Partial<StorageState>) => {
    if (
        payload.currentBucket &&
        payload.currentBucket !== storage.getCurrentBucket()?.name
    ) {
        storage.selectBucket(payload.currentBucket);
    }
    if (payload.currentPath) {
        storage.navigateToFolder(payload.currentPath);
    }
}, 1000, { leading: true, trailing: false });




export const storageMiddleware: Middleware = (storeAPI) => (next) => (action: UnknownAction) => {
    const result = next(action);

    if ('type' in action && 
        typeof action.type === 'string' && 
        action.type.startsWith('storage/')) {
        
        const storage = StorageManager.getInstance();

        if (action.type === 'storage/setStorageState' && action.payload) {
            const payload = action.payload as Partial<StorageState>;
            throttledStorageOperations(storage, payload);
        }
    }

    return result;
};