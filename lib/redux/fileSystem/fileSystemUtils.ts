// fileSystemUtils.ts
import { v4 as uuidv4 } from 'uuid';
import { FileSystemNode, StorageMetadata } from './types';

// Types
interface SupabaseStorageItem {
    name: string;
    id: string | null;
    updated_at: string | null;
    created_at: string | null;
    last_accessed_at: string | null;
    metadata: {
        eTag?: string;
        size?: number;
        mimetype?: string;
        cacheControl?: string;
        lastModified?: string;
        contentLength?: number;
        httpStatusCode?: number;
    } | null;
}

// Core utilities
export function processStorageMetadata(item: SupabaseStorageItem): StorageMetadata {
    const metadata = item.metadata || {};
    
    return {
        name: item.name || '',
        id: item.id,
        updated_at: item.updated_at,
        created_at: item.created_at,
        last_accessed_at: item.last_accessed_at,
        eTag: metadata.eTag || '',
        size: metadata.size || 0,
        mimetype: metadata.mimetype || '',
        cacheControl: metadata.cacheControl || '',
        lastModified: metadata.lastModified || '',
        contentLength: metadata.contentLength || 0,
        httpStatusCode: metadata.httpStatusCode || 200
    };
}

export function createNodeFromStorageItem(
    item: SupabaseStorageItem,
    path: string = '',
    content?: { blob: Blob; isDirty: boolean }
): FileSystemNode {
    const isFolder = item.id === null;
    const fullPath = `${path}/${item.name}`.replace(/^\/+/, '');
    const parentPath = path || null;

    return {
        itemid: uuidv4(),
        storagePath: fullPath,
        parentId: parentPath,
        name: item.name,
        contentType: isFolder ? "FOLDER" : "FILE",
        extension: isFolder ? '' : (item.name.split('.').pop() || ''),
        isMetadataFetched: !isFolder,
        metadata: isFolder ? undefined : processStorageMetadata(item),
        isContentFetched: !!content,
        content,
        status: "idle",
        operation: "none",
        isDirty: false
    };
}

export function normalizeStoragePath(path: string): string {
    return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function processStorageList(data: SupabaseStorageItem[], path: string = ''): FileSystemNode[] {
    if (!Array.isArray(data)) {
        throw new Error("Input data must be an array.");
    }

    return data.map(item => createNodeFromStorageItem(item, path));
}