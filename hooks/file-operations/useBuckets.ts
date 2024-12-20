// hooks/useStorageExplorer.ts
import { useState, useEffect } from 'react';
import { StorageClient } from '@/utils/supabase/bucket-manager';
import { StorageItem, BucketInfo, FileTypeInfo, StorageResponse } from '@/types/file-operations.types';
import {formatItemDetails, getFileTypeInfo, processStorageList, validateOperation} from "@/components/file-operations/utils";
import {FileObject, Bucket} from '@supabase/storage-js';

export type SupabaseFileObject = FileObject;
export type SupabaseBucket = Bucket;

interface useStorageBucketsProps {
    onLog?: (message: string, type: 'success' | 'error' | 'info') => void;
    onApiResponse?: (operation: string, response: unknown, error?: unknown, request?: unknown) => void;
}

type StorageOperation<T> = Promise<{
    data: T;
    error: Error | null;
}>;

export function useStorageBuckets({ onLog, onApiResponse }: useStorageBucketsProps = {}) {
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
                owner: bucket.owner,
                public: bucket.public,
                fileSizeLimit: bucket.file_size_limit,
                allowedMimeTypes: bucket.allowed_mime_types,
                createdAt: bucket.created_at,
                updatedAt: bucket.updated_at,
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
    };
}

export type UseStorageBucketsReturn = ReturnType<typeof useStorageBuckets>;