interface NodeMetadata {
    size: number;
    mimetype: string;
    lastModified: string;
    // ... other metadata
}

interface NodeContent {
    blob?: Blob;
    isContentDirty: boolean;
    lastSynced?: string;
}

export interface FileSystemNode {
    id: string;
    bucketName: string;
    path: string;
    name: string;
    contentType: 'FILE' | 'FOLDER' | 'BUCKET';
    extension: string;
    parentPath: string | null;
    metadata?: NodeMetadata;
    content?: NodeContent;
    isMetadataFetched: boolean;
    isContentFetched: boolean;
}

export interface FileSystemState {
    nodes: Record<string, FileSystemNode>;
    buckets: Record<string, {
        name: string;
        isFetched: boolean;
        isDirty: boolean;
    }>;
    activeBucketName: string | null;
    activeNodePath: string | null;
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
}


export interface SupabaseMetadata {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
}

export interface StorageItem {
    name: string;
    id: string | null;
    updated_at: string | null;
    created_at: string | null;
    last_accessed_at: string | null;
    metadata: StorageMetadata | null;
}
