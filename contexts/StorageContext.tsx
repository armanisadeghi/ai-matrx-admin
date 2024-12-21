// contexts/StorageContext.tsx
'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import {Bucket, StorageItem } from '@/utils/supabase/StorageBase';
import {
    useStorageManager,
    useBuckets,
    useFolderNavigation,
    useCreateFolder,
    useUploadFile,
    useItemOperations,
    useItemDownload,
    useRefreshFolder
} from '@/hooks/file-operations/useStorageManagerHooks';
import { FileTypeManager } from '@/utils/file-operations/FileTypeManager';
import { EnhancedDirectoryTreeConfig, ENHANCED_DEFAULT_CONFIG } from '@/components/DirectoryTree/config';
import { toast } from '@/components/ui/use-toast';

interface StorageContextType {
    // State
    isLoading: boolean;
    error: string | null;
    selectedItem: StorageItem | null;
    config: EnhancedDirectoryTreeConfig;
    fileTypeManager: FileTypeManager;

    // Data
    buckets: Bucket[];
    currentBucket: Bucket | null;
    currentPath: string[];
    currentItems: StorageItem[];

    // Actions
    selectBucket: (bucketName: string) => Promise<void>;
    navigateToFolder: (path: string[]) => Promise<void>;
    createFolder: (name: string) => Promise<void>;
    uploadFile: (file: File) => Promise<void>;
    deleteItem: (item: StorageItem) => Promise<void>;
    renameItem: (item: StorageItem, newName: string) => Promise<void>;
    refreshFolder: () => Promise<void>;
    setSelectedItem: (item: StorageItem | null) => void;
    updateConfig: (config: Partial<EnhancedDirectoryTreeConfig>) => void;
    downloadItem: (item: StorageItem) => Promise<void>;
}

const StorageContext = createContext<StorageContextType | null>(null);

export function StorageProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
    const [config, setConfig] = useState<EnhancedDirectoryTreeConfig>(ENHANCED_DEFAULT_CONFIG);
    const [fileTypeManager] = useState(() => FileTypeManager.getInstance());

    const storageManager = useStorageManager();
    const { buckets, currentBucket, listBuckets, selectBucket: selectBucketBase } = useBuckets(storageManager);
    const { currentPath, currentItems, navigateToFolder: navigateToFolderBase } = useFolderNavigation(storageManager);
    const { createFolder: createFolderBase } = useCreateFolder(storageManager);
    const { uploadFile: uploadFileBase } = useUploadFile(storageManager);
    const { deleteItem: deleteItemBase, renameItem: renameItemBase } = useItemOperations(storageManager);
    const { refreshCurrentFolder } = useRefreshFolder(storageManager);
    const { downloadItem: downloadItemBase } = useItemDownload(storageManager);

    const handleError = useCallback((error: any, message: string) => {
        console.error(error);
        setError(message);
        toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
        });
    }, []);

    const selectBucket = useCallback(async (bucketName: string) => {
        try {
            setIsLoading(true);
            await selectBucketBase(bucketName);
            await navigateToFolderBase([]);
        } catch (error) {
            handleError(error, 'Failed to select bucket');
        } finally {
            setIsLoading(false);
        }
    }, [selectBucketBase, navigateToFolderBase, handleError]);

    const navigateToFolder = useCallback(async (path: string[]) => {
        try {
            setIsLoading(true);
            await navigateToFolderBase(path);
        } catch (error) {
            handleError(error, 'Failed to navigate to folder');
        } finally {
            setIsLoading(false);
        }
    }, [navigateToFolderBase, handleError]);

    const createFolder = useCallback(async (name: string) => {
        try {
            setIsLoading(true);
            await createFolderBase([...currentPath, name]);
            await refreshCurrentFolder();
            toast({
                title: 'Success',
                description: 'Folder created successfully',
            });
        } catch (error) {
            handleError(error, 'Failed to create folder');
        } finally {
            setIsLoading(false);
        }
    }, [createFolderBase, currentPath, refreshCurrentFolder, handleError]);

    const uploadFile = useCallback(async (file: File) => {
        try {
            setIsLoading(true);
            await uploadFileBase(file, currentPath);
            await refreshCurrentFolder();
            toast({
                title: 'Success',
                description: 'File uploaded successfully',
            });
        } catch (error) {
            handleError(error, 'Failed to upload file');
        } finally {
            setIsLoading(false);
        }
    }, [uploadFileBase, currentPath, refreshCurrentFolder, handleError]);

    const deleteItem = useCallback(async (item: StorageItem) => {
        try {
            setIsLoading(true);
            await deleteItemBase(item);
            await refreshCurrentFolder();
            if (selectedItem?.id === item.id) {
                setSelectedItem(null);
            }
            toast({
                title: 'Success',
                description: 'Item deleted successfully',
            });
        } catch (error) {
            handleError(error, 'Failed to delete item');
        } finally {
            setIsLoading(false);
        }
    }, [deleteItemBase, refreshCurrentFolder, selectedItem, handleError]);

    const renameItem = useCallback(async (item: StorageItem, newName: string) => {
        try {
            setIsLoading(true);
            await renameItemBase(item, newName);
            await refreshCurrentFolder();
            toast({
                title: 'Success',
                description: 'Item renamed successfully',
            });
        } catch (error) {
            handleError(error, 'Failed to rename item');
        } finally {
            setIsLoading(false);
        }
    }, [renameItemBase, refreshCurrentFolder, handleError]);

    const downloadItem = useCallback(async (item: StorageItem) => {
        try {
            setIsLoading(true);
            await downloadItemBase(item);
        } catch (error) {
            handleError(error, 'Failed to download item');
        } finally {
            setIsLoading(false);
        }
    },  [downloadItemBase, handleError]);


    const refreshFolder = useCallback(async () => {
        try {
            setIsLoading(true);
            await refreshCurrentFolder();
        } catch (error) {
            handleError(error, 'Failed to refresh folder');
        } finally {
            setIsLoading(false);
        }
    }, [refreshCurrentFolder, handleError]);

    const updateConfig = useCallback((newConfig: Partial<EnhancedDirectoryTreeConfig>) => {
        setConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const value = {
        isLoading,
        error,
        selectedItem,
        config,
        fileTypeManager,
        buckets,
        currentBucket,
        currentPath,
        currentItems,
        selectBucket,
        navigateToFolder,
        createFolder,
        uploadFile,
        deleteItem,
        renameItem,
        refreshFolder,
        setSelectedItem,
        updateConfig,
        downloadItem,
    };

    return (
        <StorageContext.Provider value={value}>
            {children}
        </StorageContext.Provider>
    );
}

export function useStorage() {
    const context = useContext(StorageContext);
    if (!context) {
        throw new Error('useStorage must be used within a StorageProvider');
    }
    return context;
}