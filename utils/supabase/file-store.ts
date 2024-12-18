import { supabase } from "@/utils/supabase/client";
import {StorageError, FileObject, FileObjectV2} from '@supabase/storage-js';


export type BucketOptions = {
    public: boolean;
    allowedMimeTypes?: string[] | null;
    fileSizeLimit?: string | number | null;
};

export type FileUploadOptions = {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
};

export type ListOptions = {
    limit?: number;
    offset?: number;
    sortBy?: {
        column: string;
        order: 'asc' | 'desc';
    };
    search?: string;
};

// Basic file operations
export const uploadFile = async (
    bucketName: string,
    path: string,
    file: File | ArrayBuffer,
    options?: FileUploadOptions
) => {
    return await supabase.storage
        .from(bucketName)
        .upload(path, file, options);
};

export const downloadFile = async (
    bucketName: string,
    path: string
) => {
    return await supabase.storage
        .from(bucketName)
        .download(path);
};

export const deleteFile = async (
    bucketName: string,
    path: string
) => {
    return await supabase.storage
        .from(bucketName)
        .remove([path]);
};

// Bulk operations
export const uploadFiles = async (
    bucketName: string,
    files: { path: string; file: File | ArrayBuffer; options?: FileUploadOptions }[]
) => {
    const promises = files.map(({ path, file, options }) =>
        uploadFile(bucketName, path, file, options)
    );
    return await Promise.all(promises);
};

export const downloadFiles = async (
    bucketName: string,
    paths: string[]
) => {
    const promises = paths.map(path => downloadFile(bucketName, path));
    return await Promise.all(promises);
};

export const deleteFiles = async (
    bucketName: string,
    paths: string[]
) => {
    return await supabase.storage
        .from(bucketName)
        .remove(paths);
};

// List and search
export const listFiles = async (
    bucketName: string,
    path?: string,
    options?: ListOptions
) => {
    return await supabase.storage
        .from(bucketName)
        .list(path || '', options);
};

// File operations
export const moveFile = async (
    bucketName: string,
    fromPath: string,
    toPath: string
) => {
    return await supabase.storage
        .from(bucketName)
        .move(fromPath, toPath);
};

export const copyFile = async (
    bucketName: string,
    fromPath: string,
    toPath: string
) => {
    return await supabase.storage
        .from(bucketName)
        .copy(fromPath, toPath);
};

// Bucket operations
export const createBucket = async (
    bucketName: string,
    options?: BucketOptions
) => {
    return await supabase.storage
        .createBucket(bucketName, options);
};

export const deleteBucket = async (
    bucketName: string
) => {
    return await supabase.storage
        .deleteBucket(bucketName);
};

export const listBuckets = async () => {
    return await supabase.storage
        .listBuckets();
};

export const getBucket = async (
    bucketName: string
) => {
    return await supabase.storage
        .getBucket(bucketName);
};

// Utility functions
export const getPublicUrl = (
    bucketName: string,
    path: string
) => {
    return supabase.storage
        .from(bucketName)
        .getPublicUrl(path);
};

export const updateFile = async (
    bucketName: string,
    path: string,
    file: File | ArrayBuffer,
    options?: FileUploadOptions
) => {
    return await supabase.storage
        .from(bucketName)
        .update(path, file, options);
};

// Helper function to check if file exists
export const fileExists = async (
    bucketName: string,
    path: string
): Promise<boolean> => {
    const { data } = await listFiles(bucketName, path);
    return data?.some(file => file.name === path.split('/').pop()) ?? false;
};

// Helper function to get file metadata
export const getFileMetadata = async (
    bucketName: string,
    path: string
): Promise<FileObject | null> => {
    const { data } = await listFiles(bucketName, path);
    return data?.find(file => file.name === path.split('/').pop()) ?? null;
};