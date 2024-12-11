// lib/redux/sagas/storage/storageManager.ts
'use client';

import { StorageVerification } from '@/hooks/useLocalStorageManager';

class StorageManager {
    setItem<T>(module: string, feature: string, key: string, value: T): Promise<StorageVerification> {
        try {
            const fullKey = this.constructKey(module, feature, key);
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(fullKey, serializedValue);
            return Promise.resolve({ success: true, message: `Item set successfully: ${fullKey}` });
        } catch (error) {
            return Promise.resolve({ success: false, message: `Error setting item: ${error}` });
        }
    }

    getItem<T>(module: string, feature: string, key: string): Promise<T | null> {
        try {
            const fullKey = this.constructKey(module, feature, key);
            const serializedValue = localStorage.getItem(fullKey);
            return Promise.resolve(serializedValue ? JSON.parse(serializedValue) : null);
        } catch (error) {
            console.error(`Error retrieving item from localStorage: ${error}`);
            return Promise.resolve(null);
        }
    }

    private constructKey(module: string, feature: string, key: string): string {
        return `${module}/${feature}/${key}`;
    }
}

export const storageManager = new StorageManager();
