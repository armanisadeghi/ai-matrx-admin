'use client';

import { useCallback } from 'react';

export type CookieOptions = {
    expires?: string;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
};

export type StorageVerification = {
    success: boolean;
    message: string;
    data?: any;
};

export type UseLocalStorageManager = {
    setItem: <T>(module: string, feature: string, key: string, value: T) => Promise<StorageVerification>;
    getItem: <T>(module: string, feature: string, key: string) => Promise<T | null>;
    removeItem: (module: string, feature: string, key: string) => Promise<StorageVerification>;
    clearFeature: (module: string, feature: string) => Promise<StorageVerification>;
    clearModule: (module: string) => Promise<StorageVerification>;
    getAllKeys: () => Promise<string[]>;
    getAllModules: () => Promise<string[]>;
    getAllFeatures: (module: string) => Promise<string[]>;
    clearAll: () => Promise<StorageVerification>;
    getCookies: () => Promise<Record<string, string>>;
    setCookie: (name: string, value: string, options?: CookieOptions) => Promise<StorageVerification>;
    verifyCookie: (name: string) => Promise<StorageVerification>;
    verifyStorageItem: (module: string, feature: string, key: string) => Promise<StorageVerification>;
    getStorageSize: () => Promise<{ used: number; remaining: number }>;
    exportStorageData: () => Promise<string>;
    importStorageData: (data: string) => Promise<StorageVerification>;
    getCookieDetails: (name: string) => Promise<{ value: string; options: CookieOptions } | null>;
    removeCookie: (name: string) => Promise<StorageVerification>;
};

export function useLocalStorageManager(): UseLocalStorageManager {
    const constructKey = useCallback((module: string, feature: string, key: string): string => {
        return `${module}/${feature}/${key}`;
    }, []);

    const setItem = useCallback(async <T,>(module: string, feature: string, key: string, value: T): Promise<StorageVerification> => {
        try {
            const fullKey = constructKey(module, feature, key);
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(fullKey, serializedValue);
            return { success: true, message: `Item set successfully: ${fullKey}` };
        } catch (error) {
            return { success: false, message: `Error setting item: ${error}` };
        }
    }, [constructKey]);

    const getItem = useCallback(async <T,>(module: string, feature: string, key: string): Promise<T | null> => {
        try {
            const fullKey = constructKey(module, feature, key);
            const serializedValue = localStorage.getItem(fullKey);
            return serializedValue ? JSON.parse(serializedValue) : null;
        } catch (error) {
            console.error(`Use local storage manager... Error retrieving item from localStorage: ${error}`);
            return null;
        }
    }, [constructKey]);

    const removeItem = useCallback(async (module: string, feature: string, key: string): Promise<StorageVerification> => {
        try {
            const fullKey = constructKey(module, feature, key);
            localStorage.removeItem(fullKey);
            return { success: true, message: `Item removed successfully: ${fullKey}` };
        } catch (error) {
            return { success: false, message: `Error removing item: ${error}` };
        }
    }, [constructKey]);

    const clearFeature = useCallback(async (module: string, feature: string): Promise<StorageVerification> => {
        try {
            const prefix = `${module}/${feature}/`;
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith(prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return { success: true, message: `Feature cleared: ${module}/${feature}` };
        } catch (error) {
            return { success: false, message: `Error clearing feature: ${error}` };
        }
    }, []);

    const clearModule = useCallback(async (module: string): Promise<StorageVerification> => {
        try {
            const prefix = `${module}/`;
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith(prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return { success: true, message: `Module cleared: ${module}` };
        } catch (error) {
            return { success: false, message: `Error clearing module: ${error}` };
        }
    }, []);

    const getAllKeys = useCallback(async (): Promise<string[]> => {
        return Object.keys(localStorage);
    }, []);

    const getAllModules = useCallback(async (): Promise<string[]> => {
        const keys = Object.keys(localStorage);
        const modules = new Set(keys.map((key) => key.split('/')[0]));
        return Array.from(modules);
    }, []);

    const getAllFeatures = useCallback(async (module: string): Promise<string[]> => {
        const keys = Object.keys(localStorage).filter((key) => key.startsWith(`${module}/`));
        const features = new Set(keys.map((key) => key.split('/')[1]));
        return Array.from(features);
    }, []);

    const clearAll = useCallback(async (): Promise<StorageVerification> => {
        try {
            localStorage.clear();
            return { success: true, message: 'All items cleared from localStorage' };
        } catch (error) {
            return { success: false, message: `Error clearing all items: ${error}` };
        }
    }, []);

    const getCookies = useCallback(async (): Promise<Record<string, string>> => {
        try {
            const cookieString = document.cookie;
            const cookies = cookieString.split('; ').reduce((acc: Record<string, string>, cookie) => {
                const [name, value] = cookie.split('=');
                acc[name] = value;
                return acc;
            }, {});
            return cookies;
        } catch (error) {
            console.error(`Error getting cookies: ${error}`);
            return {};
        }
    }, []);

    const setCookie = useCallback(
        async (
            name: string,
            value: string,
            options: CookieOptions = {}
        ): Promise<StorageVerification> => {
            try {
                let cookieString = `${name}=${value}`;
                if (options.expires) cookieString += `; expires=${options.expires}`;
                if (options.path) cookieString += `; path=${options.path}`;
                if (options.domain) cookieString += `; domain=${options.domain}`;
                if (options.secure) cookieString += `; secure`;
                if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
                document.cookie = cookieString;
                return { success: true, message: `Cookie set successfully: ${name}` };
            } catch (error) {
                return { success: false, message: `Error setting cookie: ${error}` };
            }
        },
        []
    );

    const verifyCookie = useCallback(async (name: string): Promise<StorageVerification> => {
        try {
            const cookies = await getCookies();
            if (cookies[name]) {
                return { success: true, message: `Cookie found: ${name}`, data: cookies[name] };
            } else {
                return { success: false, message: `Cookie not found: ${name}` };
            }
        } catch (error) {
            return { success: false, message: `Error verifying cookie: ${error}` };
        }
    }, [getCookies]);

    const verifyStorageItem = useCallback(
        async (module: string, feature: string, key: string): Promise<StorageVerification> => {
            try {
                const fullKey = constructKey(module, feature, key);
                const value = localStorage.getItem(fullKey);
                if (value) {
                    return { success: true, message: `Storage item found: ${fullKey}`, data: JSON.parse(value) };
                } else {
                    return { success: false, message: `Storage item not found: ${fullKey}` };
                }
            } catch (error) {
                return { success: false, message: `Error verifying storage item: ${error}` };
            }
        },
        [constructKey]
    );

    const getStorageSize = useCallback(async (): Promise<{ used: number; remaining: number }> => {
        const used = JSON.stringify(localStorage).length;
        const remaining = 5 * 1024 * 1024 - used; // Assuming 5MB max storage limit
        return { used, remaining };
    }, []);

    const exportStorageData = useCallback(async (): Promise<string> => {
        return JSON.stringify(localStorage);
    }, []);

    const importStorageData = useCallback(async (data: string): Promise<StorageVerification> => {
        try {
            const parsedData = JSON.parse(data);
            for (const key in parsedData) {
                localStorage.setItem(key, parsedData[key]);
            }
            return { success: true, message: 'Storage data imported successfully' };
        } catch (error) {
            return { success: false, message: `Error importing storage data: ${error}` };
        }
    }, []);

    const getCookieDetails = useCallback(async (name: string): Promise<{ value: string; options: CookieOptions } | null> => {
        try {
            const cookies = await getCookies();
            if (cookies[name]) {
                return { value: cookies[name], options: {} }; // Cookie parsing for options is not standard, returning empty
            }
            return null;
        } catch (error) {
            return null;
        }
    }, [getCookies]);

    const removeCookie = useCallback(async (name: string): Promise<StorageVerification> => {
        try {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            return { success: true, message: `Cookie removed: ${name}` };
        } catch (error) {
            return { success: false, message: `Error removing cookie: ${error}` };
        }
    }, []);

    return {
        setItem,
        getItem,
        removeItem,
        clearFeature,
        clearModule,
        getAllKeys,
        getAllModules,
        getAllFeatures,
        clearAll,
        getCookies,
        setCookie,
        verifyCookie,
        verifyStorageItem,
        getStorageSize,
        exportStorageData,
        importStorageData,
        getCookieDetails,
        removeCookie,
    };
}

export default useLocalStorageManager;
