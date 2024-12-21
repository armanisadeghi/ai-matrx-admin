// types/file-operations.types.ts
import {FileObject, Bucket} from '@supabase/storage-js';

export interface StorageItem {
    // Basic Info
    id: string;
    name: string;
    path: string;
    isFolder: boolean;

    // File System Info
    extension: string;
    basename: string; // name without extension

    // Timestamps
    createdAt: string;
    updatedAt: string;
    lastAccessedAt: string;

    // File Type Info
    category: FileCategory;
    fileType: FileTypeInfo;

    // Size & Metadata
    size: number;
    metadata: {
        mimetype: string;
        eTag?: string;
        cacheControl?: string;
        contentLength?: number;
        httpStatusCode?: number;
        isDirectory?: boolean;
        childCount?: number; // for folders
        [key: string]: any;
    };
}

export interface BucketInfo {
    id: string;
    name: string;
    public: boolean;
    createdAt?: string;
    updatedAt?: string;
    owner?: string;
    fileSizeLimit?: number;
    allowedMimeTypes?: string[];
    metadata?: Record<string, any>;
}

export interface FileUploadOptions {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
    duplex?: 'half' | 'full';
    metadata?: Record<string, any>;
}

export interface BucketOptions {
    public?: boolean;
    fileSizeLimit?: number | null;
    allowedMimeTypes?: string[] | null;
    metadata?: Record<string, any>;
}

export interface StorageError {
    message: string;
    statusCode?: number;
    details?: any;
}

export interface StorageResponse<T = any> {
    data: T | null;
    error: StorageError | null;
}

export type SortDirection = 'asc' | 'desc';

export interface ListOptions {
    limit?: number;
    offset?: number;
    sortBy?: {
        column: string;
        direction: SortDirection;
    };
    search?: string;
    prefix?: string;
    recursive?: boolean;
}

// Utility types for specific operations
export interface MoveOperationOptions {
    targetPath: string[];
    newName?: string;
    overwrite?: boolean;
}

export interface CopyOperationOptions extends MoveOperationOptions {
    preserveMetadata?: boolean;
}

export interface FolderCreationOptions {
    metadata?: Record<string, any>;
    recursive?: boolean;
}

export interface DownloadOptions {
    transform?: {
        width?: number;
        height?: number;
        resize?: 'cover' | 'contain' | 'fill';
        format?: 'origin' | 'webp' | 'png' | 'jpeg';
        quality?: number;
    };
}

// Type guards for runtime checking
export const isStorageItem = (item: any): item is StorageItem => {
    return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.name === 'string' &&
        typeof item.id === 'string' &&
        typeof item.isFolder === 'boolean'
    );
};

export const isBucketInfo = (bucket: any): bucket is BucketInfo => {
    return (
        typeof bucket === 'object' &&
        bucket !== null &&
        typeof bucket.name === 'string' &&
        typeof bucket.id === 'string' &&
        typeof bucket.public === 'boolean'
    );
};

// Utility type for path management
export type StoragePath = {
    bucket: string;
    path: string[];
    fullPath: string;
};

// Helper function to create a storage path
export const createStoragePath = (bucket: string, path: string[]): StoragePath => ({
    bucket,
    path,
    fullPath: path.join('/')
});

// Helper function to parse a full path into components
export const parseStoragePath = (fullPath: string): { path: string[]; fileName: string } => {
    const parts = fullPath.split('/').filter(Boolean);
    return {
        path: parts.slice(0, -1),
        fileName: parts[parts.length - 1] || ''
    };
};

// Helper type to get file category
export type FileCategory =
    | 'CODE'
    | 'DOCUMENT'
    | 'AUDIO'
    | 'IMAGE'
    | 'VIDEO'
    | 'ARCHIVE'
    | 'DATA'
    | 'UNKNOWN'

export interface FileTypeInfo {
    id: string;
    name: string;
    extension: string;
    mimeType: string;
    icon: string | React.ComponentType;
    category: FileCategory;
    subCategory?: string;
    description?: string;
    color?: string;
    canPreview?: boolean;
}

export interface FolderTypeInfo {
    id: null;
    name: string;
    extension: null;
    mimeType: null;
    icon: string | React.ComponentType;
    category: 'FOLDER';
    subCategory?: string;
    canPreview?: boolean;
    description?: string;
    color?: string;
}




export interface FileTypeValidation {
    allowedTypes?: string[];
    maxSize?: number;
    validateContent?: boolean;
}