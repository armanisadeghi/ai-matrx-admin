// types/file-operations.types.ts
import { FileObject, Bucket } from '@supabase/storage-js';

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

export const COMMON_MIME_TYPES = {
    // Code Files
    CODE: {
        JAVASCRIPT: ['application/javascript', 'text/javascript'],
        TYPESCRIPT: ['application/typescript', 'text/typescript'],
        PYTHON: ['text/x-python', 'application/x-python'],
        JSON: ['application/json'],
        HTML: ['text/html'],
        CSS: ['text/css'],
        MARKDOWN: ['text/markdown'],
        XML: ['application/xml', 'text/xml'],
        YAML: ['application/yaml', 'text/yaml'],
        PLAIN: ['text/plain'],
    },

    // Documentation & Notes
    DOCUMENT: {
        // Microsoft Office
        WORD: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        EXCEL: [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        POWERPOINT: [
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ],
        // Google Workspace
        GOOGLE_DOC: ['application/vnd.google-apps.document'],
        GOOGLE_SHEET: ['application/vnd.google-apps.spreadsheet'],
        GOOGLE_SLIDES: ['application/vnd.google-apps.presentation'],
        // Other Formats
        PDF: ['application/pdf'],
        RTF: ['application/rtf'],
        TEXT: ['text/plain'],
    },

    // Media Files
    AUDIO: {
        BASIC: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
        VOICE: ['audio/webm', 'audio/aac', 'audio/mp4'],
        MIDI: ['audio/midi', 'audio/x-midi'],
        STREAMING: ['application/vnd.apple.mpegurl', 'application/x-mpegurl'],
    },

    IMAGE: {
        BASIC: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        VECTOR: ['image/svg+xml'],
        RAW: ['image/raw', 'image/x-raw'],
        DESIGN: ['image/vnd.adobe.photoshop', 'image/x-xcf'],
    },

    VIDEO: {
        BASIC: ['video/mp4', 'video/webm', 'video/ogg'],
        STREAMING: ['application/x-mpegURL', 'video/MP2T'],
        RECORDING: ['video/webm', 'video/quicktime'],
    },

    // Archives & Data
    ARCHIVE: {
        COMPRESSED: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
        DISK_IMAGE: ['application/x-iso9660-image', 'application/x-raw-disk-image'],
    },

    DATA: {
        CSV: ['text/csv'],
        XML: ['application/xml', 'text/xml'],
        JSON: ['application/json'],
        SQLITE: ['application/x-sqlite3'],
    },
} as const;

export const FILE_EXTENSIONS = {
    // Code Files
    CODE: {
        JAVASCRIPT: ['.js', '.jsx', '.mjs'],
        TYPESCRIPT: ['.ts', '.tsx', '.d.ts'],
        PYTHON: ['.py', '.pyw', '.pyx', '.pxd', '.pxi'],
        WEB: ['.html', '.htm', '.css', '.scss', '.sass', '.less'],
        CONFIG: ['.json', '.yaml', '.yml', '.toml', '.ini', '.env'],
        MARKDOWN: ['.md', '.mdx', '.markdown'],
    },

    // Documentation & Notes
    DOCUMENT: {
        MICROSOFT: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
        GOOGLE: ['.gdoc', '.gsheet', '.gslide'],
        TEXT: ['.txt', '.rtf', '.pdf'],
        NOTES: ['.note', '.md', '.txt'],
    },

    // Media Files
    AUDIO: {
        BASIC: ['.mp3', '.wav', '.ogg', '.m4a'],
        VOICE: ['.webm', '.aac', '.mp4a'],
        MIDI: ['.mid', '.midi'],
        PLAYLIST: ['.m3u', '.m3u8', '.pls'],
    },

    IMAGE: {
        BASIC: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        VECTOR: ['.svg', '.ai', '.eps'],
        RAW: ['.raw', '.cr2', '.nef', '.arw'],
        DESIGN: ['.psd', '.xcf', '.sketch'],
    },

    VIDEO: {
        BASIC: ['.mp4', '.webm', '.ogg', '.mov'],
        STREAMING: ['.m3u8', '.ts'],
        RECORDING: ['.webm', '.mov'],
    },

    // Archives & Data
    ARCHIVE: {
        COMPRESSED: ['.zip', '.rar', '.7z', '.tar', '.gz'],
        DISK_IMAGE: ['.iso', '.img', '.dmg'],
    },

    DATA: {
        STRUCTURED: ['.csv', '.xml', '.json', '.sqlite', '.db'],
        CONFIG: ['.env', '.ini', '.cfg', '.conf'],
    },
} as const;

// Helper type to get file category
export type FileCategory =
    | 'CODE'
    | 'DOCUMENT'
    | 'AUDIO'
    | 'IMAGE'
    | 'VIDEO'
    | 'ARCHIVE'
    | 'DATA'
    | 'UNKNOWN';

export interface FileTypeInfo {
    id: string;
    name: string;
    extensions: string[];
    mimeTypes: string[];
    icon: string | React.ComponentType;
    category: FileCategory;
    description?: string;
    color?: string;
}

// Helper functions for file type detection
export const getFileCategory = (fileName: string): FileCategory => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    // Implementation would check against FILE_EXTENSIONS categories
    return 'UNKNOWN';
};

export const isCodeFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return Object.values(FILE_EXTENSIONS.CODE)
        .flat()
        .some(validExt => validExt.slice(1) === ext);
};

export interface FileTypeValidation {
    allowedTypes?: string[];
    maxSize?: number;
    validateContent?: boolean;
}