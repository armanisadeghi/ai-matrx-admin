import { StorageVerification } from '@/hooks/useLocalStorageManager';

class StorageManager {
    private isClient: boolean;

    constructor() {
        // Initialize isClient as false
        this.isClient = false;
        // Update isClient after mounting
        if (typeof window !== 'undefined') {
            this.isClient = true;
        }
    }

    private checkEnvironment(): boolean {
        // Update isClient status (in case it changed)
        this.isClient = typeof window !== 'undefined';
        return this.isClient;
    }

    setItem<T>(module: string, feature: string, key: string, value: T): Promise<StorageVerification> {
        if (!this.checkEnvironment()) {
            return Promise.resolve({ 
                success: false, 
                message: 'localStorage is not available in server environment' 
            });
        }

        try {
            const fullKey = this.constructKey(module, feature, key);
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(fullKey, serializedValue);
            return Promise.resolve({ 
                success: true, 
                message: `Item set successfully: ${fullKey}` 
            });
        } catch (error) {
            return Promise.resolve({ 
                success: false, 
                message: `Error setting item: ${error}` 
            });
        }
    }

    getItem<T>(module: string, feature: string, key: string): Promise<T | null> {
        if (!this.checkEnvironment()) {
            return Promise.resolve(null);
        }

        try {
            const fullKey = this.constructKey(module, feature, key);
            const serializedValue = localStorage.getItem(fullKey);
            return Promise.resolve(serializedValue ? JSON.parse(serializedValue) : null);
        } catch (error) {
            console.error(`Redux Sagas Storage, Error retrieving item from localStorage: ${error}`);
            return Promise.resolve(null);
        }
    }

    private constructKey(module: string, feature: string, key: string): string {
        return `${module}/${feature}/${key}`;
    }
}

export const storageManager = new StorageManager();