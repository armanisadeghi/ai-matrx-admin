// hooks/useStorageExplorer.ts
import { useState, useEffect } from 'react';
import { StorageClient } from '@/utils/supabase/bucket-manager';
import { StorageItem, BucketInfo, FileTypeInfo, StorageResponse } from '@/types/file-operations.types';
import {formatItemDetails, getFileTypeInfo, processStorageList, validateOperation} from "@/components/file-operations/utils";
import {FileObject, Bucket} from '@supabase/storage-js';

export type SupabaseFileObject = FileObject;
export type SupabaseBucket = Bucket;

export interface UseStorageExplorerProps {
    onLog?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export interface UseStorageExplorerReturn {
    // Bucket State
    buckets: BucketInfo[];
    currentBucket: string;
    isBucketLoading: boolean;
    bucketError: string | null;

    // File/Folder State
    currentPath: string[];
    items: StorageItem[];
    selectedItem: StorageItem | null;
    isLoading: boolean;
    error: string | null;
    isRoot: boolean;

    // Bucket Operations
    loadBuckets: () => Promise<void>;
    createBucket: (name: string, isPublic?: boolean) => Promise<boolean>;
    deleteBucket: (name: string) => Promise<void>;
    setCurrentBucket: (bucket: string) => void;

    // Item Selection
    setSelectedItem: (item: StorageItem | null) => void;

    // Navigation
    navigateToFolder: (folderName: string) => void;
    navigateUp: () => void;
    navigateToRoot: () => void;

    // File Operations
    uploadFile: (file: File, customFileName?: string) => Promise<StorageResponse<StorageItem>>;
    moveItem: (item: StorageItem, newPath: string[]) => Promise<void>;
    copyItem: (item: StorageItem, newPath: string[]) => Promise<void>;
    deleteItem: (item: StorageItem) => Promise<void>;
    createFolder: (folderName: string) => Promise<void>;

    // Utility Operations
    refresh: () => Promise<void>;
    getPublicUrl: (item: StorageItem) => string;
    downloadItem: (item: StorageItem) => Promise<void>;
    getItemDetails: (item: StorageItem) => Record<string, string>;
    validateOperation: (operation: string, item: StorageItem) => boolean;
    getFileTypeInfo: (fileName: string) => FileTypeInfo;
}

export function useStorageExplorer({ onLog }: UseStorageExplorerProps = {}) {
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

        try {
            const { data, error } = await StorageClient.listBuckets();
            if (error) throw error;

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
        } catch (err) {
            setBucketError(err.message);
            log(`Failed to load buckets: ${err.message}`, 'error');
        } finally {
            setIsBucketLoading(false);
        }
    };



    const createBucket = async (name: string, isPublic: boolean = false) => {
        try {
            const { error } = await StorageClient.createBucket(name, {
                public: isPublic,
            });
            if (error) throw error;

            log(`Bucket "${name}" created successfully`, 'success');
            await loadBuckets();
            return true;
        } catch (err) {
            log(`Failed to create bucket: ${err.message}`, 'error');
            throw err;
        }
    };

    const deleteBucket = async (name: string) => {
        try {
            const { error } = await StorageClient.deleteBucket(name);
            if (error) throw error;

            if (currentBucket === name) {
                setCurrentBucket('');
            }
            log(`Bucket "${name}" deleted successfully`, 'success');
            await loadBuckets();
        } catch (err) {
            log(`Failed to delete bucket: ${err.message}`, 'error');
            throw err;
        }
    };

    // Directory Operations
    const loadCurrentDirectory = async () => {
        if (!currentBucket) return;

        setIsLoading(true);
        setError(null);

        try {
            const storage = new StorageClient(currentBucket);
            const { data, error } = await storage.list(currentFullPath);
            if (error) throw error;

            // Properly process the storage list using our utility
            const processedItems = processStorageList(data as SupabaseFileObject[], currentPath);
            setItems(processedItems);
            log('Directory loaded successfully', 'success');
        } catch (err) {
            setError(err.message);
            log(`Failed to load directory: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };


    const createFolder = async (folderName: string) => {
        if (!currentBucket) return;

        try {
            const storage = new StorageClient(currentBucket);
            const fullPath = currentPath.length > 0
                ? `${currentPath.join('/')}/${folderName}/.keep`
                : `${folderName}/.keep`;

            // Create a File object instead of a Blob
            const emptyFile = new File([""], ".keep", {
                type: "application/x-directory"
            });

            const { error } = await storage.upload(fullPath, emptyFile, {
                contentType: 'application/x-directory'
            });
            if (error) throw error;

            log(`Folder "${folderName}" created successfully`, 'success');
            await loadCurrentDirectory();
        } catch (err) {
            log(`Failed to create folder: ${err.message}`, 'error');
            throw err;
        }
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

        try {
            // Validate file type if needed
            // const isValid = validateFileType(file, yourValidationRules);
            // if (!isValid) throw new Error('Invalid file type');

            const storage = new StorageClient(currentBucket);
            const fileName = customFileName || file.name;
            const fullPath = currentPath.length > 0
                ? `${currentPath.join('/')}/${fileName}`
                : fileName;

            const { data, error } = await storage.upload(fullPath, file, {
                cacheControl: '3600',
                upsert: true
            });

            if (error) throw error;

            log(`File uploaded successfully: ${fileName}`, 'success');
            loadCurrentDirectory();
            return data;
        } catch (err) {
            log(`Upload failed: ${err.message}`, 'error');
            throw err;
        }
    };

    const moveItem = async (item: StorageItem, newPath: string[]) => {
        if (!currentBucket || !item) return;
        if (!validateOperation('move', item)) {
            throw new Error('Invalid operation for this item type');
        }

        try {
            const storage = new StorageClient(currentBucket);
            const sourcePath = [...currentPath, item.name].join('/');
            const destinationPath = [...newPath, item.name].join('/');

            const { error } = await storage.move(sourcePath, destinationPath);
            if (error) throw error;

            log(`Item moved successfully: ${item.name}`, 'success');
            loadCurrentDirectory();
        } catch (err) {
            log(`Move failed: ${err.message}`, 'error');
            throw err;
        }
    };


    const copyItem = async (item: StorageItem, newPath: string[]) => {
        if (!currentBucket || !item) return;

        try {
            const storage = new StorageClient(currentBucket);
            const sourcePath = [...currentPath, item.name].join('/');
            const destinationPath = [...newPath, item.name].join('/');

            const { error } = await storage.copy(sourcePath, destinationPath);
            if (error) throw error;

            log(`Item copied successfully: ${item.name}`, 'success');
            loadCurrentDirectory();
        } catch (err) {
            log(`Copy failed: ${err.message}`, 'error');
            throw err;
        }
    };

    const deleteItem = async (item: StorageItem) => {
        if (!currentBucket || !item) return;

        try {
            const storage = new StorageClient(currentBucket);
            const fullPath = [...currentPath, item.name].join('/');

            const { error } = await storage.delete(fullPath);
            if (error) throw error;

            log(`Item deleted successfully: ${item.name}`, 'success');
            loadCurrentDirectory();
        } catch (err) {
            log(`Delete failed: ${err.message}`, 'error');
            throw err;
        }
    };

    const getPublicUrl = (item: StorageItem): string => {
        if (!currentBucket) return '';
        const storage = new StorageClient(currentBucket);
        const fullPath = [...currentPath, item.name].join('/');
        const { data } = storage.getPublicUrl(fullPath);
        return data.publicUrl;
    };

    const downloadItem = async (item: StorageItem) => {
        if (!currentBucket || !item) return;

        try {
            const storage = new StorageClient(currentBucket);
            const fullPath = [...currentPath, item.name].join('/');
            const { data, error } = await storage.download(fullPath);
            if (error) throw error;

            // Create and trigger download
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
        } catch (err) {
            log(`Download failed: ${err.message}`, 'error');
            throw err;
        }
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
