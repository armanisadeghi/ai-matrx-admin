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
    name: string;
    icon: string | React.ComponentType;
    category: 'FOLDER';
    description?: string;
    color?: string;
}




