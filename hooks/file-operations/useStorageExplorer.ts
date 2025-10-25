// hooks/useStorageExplorer.ts
import { useState, useEffect } from 'react';
import { StorageClient } from '@/utils/supabase/bucket-manager';
import { StorageItem, BucketInfo } from '@/types/file-operations.types';
import {formatItemDetails, getFileTypeInfo, processStorageList, validateOperation} from "@/components/file-operations/utils";
import {FileObject, Bucket} from '@supabase/storage-js';

export type SupabaseFileObject = FileObject;
export type SupabaseBucket = Bucket;

interface UseStorageExplorerProps {
    onLog?: (message: string, type: 'success' | 'error' | 'info') => void;
    onApiResponse?: (operation: string, response: unknown, error?: unknown, request?: unknown) => void;
}

type StorageOperation<T> = Promise<{
    data: T;
    error: Error | null;
}>;

export function useStorageExplorer({ onLog, onApiResponse }: UseStorageExplorerProps = {}) {
    // Bucket State
    const [buckets, setBuckets] = useState<BucketInfo[]>([]);
    const [currentBucket, setCurrentBucket] = useState<string>('');
    const [isBucketLoading, setIsBucketLoading] = useState(false);
    const [bucketError, setBucketError] = useState<string | null>(null);

    // File/Folder State
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [items, setItems] = useState<StorageItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentFullPath = currentPath.join('/');
    const isRoot = currentPath.length === 0;

    const log = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        onLog?.(message, type);
    };

    const executeStorageOperation = async <T,>(
        operation: string,
        func: () => StorageOperation<T>,
        request?: unknown
    ): Promise<{ data: T | null; error: Error | null }> => {
        try {
            const startTime = Date.now();
            const response = await func();
            const duration = Date.now() - startTime;

            // Log the API response
            onApiResponse?.(operation, {
                data: response.data,
                error: response.error,
                duration,
                timestamp: new Date().toISOString()
            }, response.error, request);

            if (response.error) {
                throw response.error;
            }

            return { data: response.data, error: null };
        } catch (error) {
            // Log any unexpected errors
            onApiResponse?.(operation, null, error, request);
            return { data: null, error: error as Error };
        }
    };

    // Load buckets on mount
    useEffect(() => {
        loadBuckets();
    }, []);
``
    // Reset state when bucket changes
    useEffect(() => {
        if (currentBucket) {
            setCurrentPath([]);
            setSelectedItem(null);
            loadCurrentDirectory();
        } else {
            setItems([]);
        }
    }, [currentBucket]);

    // Bucket Operations
    const loadBuckets = async () => {
        setIsBucketLoading(true);
        setBucketError(null);

        const { data, error } = await executeStorageOperation(
            'listBuckets',
            () => StorageClient.listBuckets()
        );

        if (error) {
            setBucketError(error.message);
            log(`Failed to load buckets: ${error.message}`, 'error');
        } else if (data) {
            setBuckets(data.map((bucket: SupabaseBucket): BucketInfo => ({
                id: bucket.id,
                name: bucket.name,
                public: bucket.public,
                owner: bucket.owner,
                createdAt: bucket.created_at,
                updatedAt: bucket.updated_at,
                fileSizeLimit: bucket.file_size_limit,
                allowedMimeTypes: bucket.allowed_mime_types
            })));
            log('Buckets loaded successfully', 'success');
        }

        setIsBucketLoading(false);
    };



    const createBucket = async (name: string, isPublic: boolean = false) => {
        const { error } = await executeStorageOperation(
            'createBucket',
            () => StorageClient.createBucket(name, { public: isPublic }),
            { name, isPublic }
        );

        if (error) {
            log(`Failed to create bucket: ${error.message}`, 'error');
            throw error;
        }

        log(`Bucket "${name}" created successfully`, 'success');
        await loadBuckets();
        return true;
    };

    const deleteBucket = async (name: string) => {
        const { error } = await executeStorageOperation(
            'deleteBucket',
            () => StorageClient.deleteBucket(name),
            { name }
        );

        if (error) {
            log(`Failed to delete bucket: ${error.message}`, 'error');
            throw error;
        }

        if (currentBucket === name) {
            setCurrentBucket('');
        }
        log(`Bucket "${name}" deleted successfully`, 'success');
        await loadBuckets();
    };

    // Directory Operations
    const loadCurrentDirectory = async () => {
        if (!currentBucket) return;

        setIsLoading(true);
        setError(null);

        const storage = new StorageClient(currentBucket);
        const { data, error } = await executeStorageOperation(
            'listDirectory',
            () => storage.list(currentFullPath),
            { bucket: currentBucket, path: currentFullPath }
        );

        if (error) {
            setError(error.message);
            log(`Failed to load directory: ${error.message}`, 'error');
        } else if (data) {
            const processedItems = processStorageList(data as SupabaseFileObject[], currentPath);
            setItems(processedItems);
            log('Directory loaded successfully', 'success');
        }

        setIsLoading(false);
    };



    const createFolder = async (folderName: string) => {
        if (!currentBucket) return;

        const storage = new StorageClient(currentBucket);
        const fullPath = currentPath.length > 0
            ? `${currentPath.join('/')}/${folderName}/.keep`
            : `${folderName}/.keep`;

        const emptyFile = new File([""], ".keep", {
            type: "application/x-directory"
        });

        const { error } = await executeStorageOperation(
            'createFolder',
            () => storage.upload(fullPath, emptyFile, {
                contentType: 'application/x-directory'
            }),
            { bucket: currentBucket, path: fullPath }
        );

        if (error) {
            log(`Failed to create folder: ${error.message}`, 'error');
            throw error;
        }

        log(`Folder "${folderName}" created successfully`, 'success');
        await loadCurrentDirectory();
    };

    // Navigation functions
    const navigateToFolder = (folderName: string) => {
        setCurrentPath(prev => [...prev, folderName]);
        setSelectedItem(null);
        loadCurrentDirectory();
    };

    const navigateUp = () => {
        setCurrentPath(prev => prev.slice(0, -1));
        setSelectedItem(null);
        loadCurrentDirectory();
    };

    const navigateToRoot = () => {
        setCurrentPath([]);
        setSelectedItem(null);
        loadCurrentDirectory();
    };

    // File operations
    const uploadFile = async (file: File, customFileName?: string) => {
        if (!currentBucket) return;

        const storage = new StorageClient(currentBucket);
        const fileName = customFileName || file.name;
        const fullPath = currentPath.length > 0
            ? `${currentPath.join('/')}/${fileName}`
            : fileName;

        const { data, error } = await executeStorageOperation(
            'uploadFile',
            () => storage.upload(fullPath, file, {
                cacheControl: '3600',
                upsert: true
            }),
            { bucket: currentBucket, path: fullPath, fileName }
        );

        if (error) {
            log(`Upload failed: ${error.message}`, 'error');
            throw error;
        }

        log(`File uploaded successfully: ${fileName}`, 'success');
        await loadCurrentDirectory();
        return data;
    };

    const moveItem = async (item: StorageItem, newPath: string[]) => {
        if (!currentBucket || !item) return;
        if (!validateOperation('move', item)) {
            throw new Error('Invalid operation for this item type');
        }

        const storage = new StorageClient(currentBucket);
        const sourcePath = [...currentPath, item.name].join('/');
        const destinationPath = [...newPath, item.name].join('/');

        const { error } = await executeStorageOperation(
            'moveItem',
            () => storage.move(sourcePath, destinationPath),
            { bucket: currentBucket, sourcePath, destinationPath }
        );

        if (error) {
            log(`Move failed: ${error.message}`, 'error');
            throw error;
        }

        log(`Item moved successfully: ${item.name}`, 'success');
        await loadCurrentDirectory();
    };


    const copyItem = async (item: StorageItem, newPath: string[]) => {
        if (!currentBucket || !item) return;

        const storage = new StorageClient(currentBucket);
        const sourcePath = [...currentPath, item.name].join('/');
        const destinationPath = [...newPath, item.name].join('/');

        const { error } = await executeStorageOperation(
            'copyItem',
            () => storage.copy(sourcePath, destinationPath),
            { bucket: currentBucket, sourcePath, destinationPath }
        );

        if (error) {
            log(`Copy failed: ${error.message}`, 'error');
            throw error;
        }

        log(`Item copied successfully: ${item.name}`, 'success');
        await loadCurrentDirectory();
    };

    const deleteItem = async (item: StorageItem) => {
        if (!currentBucket || !item) return;

        const storage = new StorageClient(currentBucket);
        const fullPath = [...currentPath, item.name].join('/');

        const { error } = await executeStorageOperation(
            'deleteItem',
            () => storage.delete(fullPath),
            { bucket: currentBucket, path: fullPath }
        );

        if (error) {
            log(`Delete failed: ${error.message}`, 'error');
            throw error;
        }

        log(`Item deleted successfully: ${item.name}`, 'success');
        await loadCurrentDirectory();
    };

    const getPublicUrl = (item: StorageItem): string => {
        if (!currentBucket || !item) return '';

        const storage = new StorageClient(currentBucket);
        const fullPath = [...currentPath, item.name].join('/');

        // This was incorrect - getPublicUrl is synchronous in StorageClient
        const result = storage.getPublicUrl(fullPath);

        // Log the operation for consistency
        onApiResponse?.('getPublicUrl', {
            data: result,
            duration: 0,
            timestamp: new Date().toISOString()
        }, null, { bucket: currentBucket, path: fullPath });

        return result.data.publicUrl;
    };


    const downloadItem = async (item: StorageItem) => {
        if (!currentBucket || !item) return;

        const storage = new StorageClient(currentBucket);
        const fullPath = [...currentPath, item.name].join('/');

        const { data, error } = await executeStorageOperation(
            'downloadItem',
            () => storage.download(fullPath),
            { bucket: currentBucket, path: fullPath }
        );

        if (error) {
            log(`Download failed: ${error.message}`, 'error');
            throw error;
        }

        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        log(`Downloaded ${item.name} successfully`, 'success');
    };

    return {
        // Bucket State
        buckets,
        currentBucket,
        isBucketLoading,
        bucketError,

        // File/Folder State
        currentPath,
        items,
        selectedItem,
        isLoading,
        error,
        isRoot,

        // Bucket Operations
        loadBuckets,
        createBucket,
        deleteBucket,
        setCurrentBucket,

        // Item Selection
        setSelectedItem,

        // Navigation
        navigateToFolder,
        navigateUp,
        navigateToRoot,

        // File Operations
        uploadFile,
        moveItem,
        copyItem,
        deleteItem,
        createFolder,

        // Utility Operations
        refresh: loadCurrentDirectory,
        getPublicUrl,
        downloadItem,
        getItemDetails: (item: StorageItem) => formatItemDetails(item),
        validateOperation: (operation: string, item: StorageItem) =>
            validateOperation(operation, item),
        getFileTypeInfo: (fileName: string) => getFileTypeInfo(fileName),

    };
}

export type UseStorageExplorerReturn = ReturnType<typeof useStorageExplorer>;