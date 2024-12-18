'use client';

import { useState, useCallback } from 'react';
import { AsyncResult } from '@/lib/idb/store-manager';
import { PublicStoreManager } from '@/lib/idb/store-interface';

export function useIDB(store: PublicStoreManager) {
    const [loadingOps, setLoadingOps] = useState(new Set<string>());

    const withLoading = useCallback(async <T,>(
        opId: string,
        operation: () => Promise<AsyncResult<T>>
    ): Promise<AsyncResult<T>> => {
        setLoadingOps(prev => new Set(prev).add(opId));
        try {
            return await operation();
        } finally {
            setLoadingOps(prev => {
                const next = new Set(prev);
                next.delete(opId);
                return next;
            });
        }
    }, []);

    const isLoading = useCallback((opId?: string) => {
        return opId ? loadingOps.has(opId) : loadingOps.size > 0;
    }, [loadingOps]);

    return {
        isLoading,
        add: useCallback(async <T extends object>(
            storeName: string,
            data: T
        ): Promise<AsyncResult<number>> => {
            return withLoading<number>(`add-${storeName}`, () =>
                store.addItem(storeName, data)
            );
        }, [withLoading, store]),

        get: useCallback(async <T,>(
            storeName: string,
            id: number
        ): Promise<AsyncResult<T>> => {
            return withLoading<T>(`get-${storeName}-${id}`, () =>
                store.getItem<T>(storeName, id)
            );
        }, [withLoading, store]),

        getAll: useCallback(async <T,>(
            storeName: string
        ): Promise<AsyncResult<T[]>> => {
            return withLoading<T[]>(`getAll-${storeName}`, () =>
                store.getAllItems<T>(storeName)
            );
        }, [withLoading, store]),

        update: useCallback(async <T extends object>(
            storeName: string,
            id: number,
            data: Partial<T>
        ): Promise<AsyncResult<boolean>> => {
            return withLoading<boolean>(`update-${storeName}-${id}`, () =>
                store.updateItem<T>(storeName, id, data)
            );
        }, [withLoading, store]),

        remove: useCallback(async (
            storeName: string,
            id: number
        ): Promise<AsyncResult<boolean>> => {
            return withLoading<boolean>(`delete-${storeName}-${id}`, () =>
                store.deleteItem(storeName, id)
            );
        }, [withLoading, store]),

        query: useCallback(async <T,>(
            storeName: string,
            indexName: string,
            queryKey: IDBValidKey | IDBKeyRange
        ): Promise<AsyncResult<T[]>> => {
            return withLoading<T[]>(`query-${storeName}-${indexName}`, () =>
                store.queryItems<T>(storeName, indexName, queryKey)
            );
        }, [withLoading, store])
    };
}