// File Location: hooks/file-operations/useStorageManagerHooks.ts

'use client';
import React, {useState, useEffect, useCallback} from 'react';
import StorageManager from '@/utils/supabase/StorageManager';
import {toast} from "@/components/ui/use-toast";

export function useStorageManager() {
    const [manager] = useState(() => StorageManager.getInstance());
    return manager;
}

export function useBuckets(manager: StorageManager) {
    const [buckets, setBuckets] = useState(() => manager.getCurrentBucket() ? [manager.getCurrentBucket()] : []);
    const [currentBucket, setCurrentBucket] = useState(manager.getCurrentBucket());
    const [loading, setLoading] = useState(false);

    const listBuckets = useCallback(async () => {
        const result = await manager.listBuckets();
        setBuckets(result);
        return result;
    }, [manager]);


    useEffect(() => {
        const fetchBuckets = async () => {
            setLoading(true);
            try {
                await listBuckets();
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to fetch buckets',
                    variant: 'destructive',
                });
            } finally {
                setLoading(false);
            }
        };
        fetchBuckets();
    }, [listBuckets]);

    const selectBucket = useCallback(async (bucketName: string) => {
        await manager.selectBucket(bucketName);
        setCurrentBucket(manager.getCurrentBucket());
    }, [manager]);

    return { buckets, currentBucket, listBuckets, selectBucket, loading };
}

export function useFolderNavigation(manager: StorageManager) {
    const [currentPath, setCurrentPath] = useState(manager.getCurrentPath());
    const [currentItems, setCurrentItems] = useState(manager.getCurrentItems());

    const navigateToFolder = useCallback(async (folderPath: string[]) => {
        const items = await manager.navigateToFolder(folderPath);
        setCurrentPath(manager.getCurrentPath());
        setCurrentItems(items);
    }, [manager]);

    useEffect(() => {
        setCurrentPath(manager.getCurrentPath());
        setCurrentItems(manager.getCurrentItems());
    }, [manager]);

    return { currentPath, currentItems, navigateToFolder };
}

export function useCreateFolder(manager: StorageManager) {
    const createFolder = useCallback(async (path: string[]) => {
        await manager.createFolder(path);
    }, [manager]);
    return { createFolder };
}

export function useUploadFile(manager: StorageManager) {
    const uploadFile = useCallback(async (file: File, targetPath: string[], customFileName?: string) => {
        return await manager.uploadFile(file, targetPath, customFileName);
    }, [manager]);
    return { uploadFile };
}

export function useItemOperations(manager: StorageManager) {
    const moveItem = useCallback(async (item, newPath: string[]) => {
        await manager.moveItem(item, newPath);
    }, [manager]);

    const renameItem = useCallback(async (item, newName: string) => {
        await manager.renameItem(item, newName);
    }, [manager]);

    const copyItem = useCallback(async (item, destinationPath: string[]) => {
        await manager.copyItem(item, destinationPath);
    }, [manager]);

    const deleteItem = useCallback(async (item) => {
        await manager.deleteItem(item);
    }, [manager]);

    return { moveItem, renameItem, copyItem, deleteItem };
}

export function useItemUrl(manager: StorageManager) {
    const getPublicUrl = useCallback(async (item) => {
        return await manager.getPublicUrl(item);
    }, [manager]);
    return { getPublicUrl };
}

export function useItemDownload(manager: StorageManager) {
    const downloadItem = useCallback(async (item) => {
        return await manager.downloadItem(item);
    }, [manager]);
    return { downloadItem };
}

export function useRefreshFolder(manager: StorageManager) {
    const refreshCurrentFolder = useCallback(async () => {
        await manager.refreshCurrentFolder();
    }, [manager]);
    return { refreshCurrentFolder };
}
