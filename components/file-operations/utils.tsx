// components/file-operations/utils.ts
import {
    FileCategory,
    FileTypeInfo,
    StorageItem
} from '@/types/file-operations.types';
import React from "react";
import {
    FileIcon,
    FileTextIcon,
    FileCodeIcon,
    FileJsonIcon,
    FileTypeIcon,
    ImageIcon,
    Volume2,
    VideoIcon,
    ArchiveIcon,
    FileSpreadsheetIcon,
    Presentation,
    FileVolume2Icon, FolderIcon,
} from 'lucide-react';
import { FileObject, Bucket } from '@supabase/storage-js';
import {COMMON_MIME_TYPES, FILE_EXTENSIONS } from '../DirectoryTree/config';

export * from '@/types/file-operations.types';

export function getFileExtension(filename: string): string {
    const match = filename.match(/\.[\w\d]+$/);
    return match ? match[0].toLowerCase() : '';
}

export const getFileCategory = (fileName: string): FileCategory => {
    const ext = getFileExtension(fileName);
    for (const [category, subcategories] of Object.entries(FILE_EXTENSIONS)) {
        for (const extensions of Object.values(subcategories)) {
            if (extensions.some(e => e.slice(1) === ext)) {
                return category as FileCategory;
            }
        }
    }

    return 'UNKNOWN';
};

const FILE_ICONS: Record<FileCategory, React.ComponentType> = {
    CODE: FileCodeIcon,
    DOCUMENT: FileTextIcon,
    AUDIO: FileVolume2Icon,
    IMAGE: ImageIcon,
    VIDEO: VideoIcon,
    ARCHIVE: ArchiveIcon,
    DATA: FileJsonIcon,
    UNKNOWN: FileIcon,
};

export const getFileIcon = (fileName: string): React.ReactNode => {
    const category = getFileCategory(fileName);
    const IconComponent = FILE_ICONS[category];
    const ext = getFileExtension(fileName);
    if (ext === 'json') return <FileJsonIcon className="h-4 w-4"/>;
    if (ext === 'xlsx' || ext === 'csv') return <FileSpreadsheetIcon className="h-4 w-4"/>;
    if (ext === 'pptx') return <Presentation className="h-4 w-4"/>;

    return <IconComponent className="h-4 w-4"/>;
};

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export interface FileTypeValidation {
    allowedTypes?: string[];
    maxSize?: number;
    validateContent?: boolean;
}
export const validateFileType = (file: File, validation: FileTypeValidation): boolean => {
    if (!validation) return true;
    const {allowedTypes, maxSize, validateContent} = validation;
    if (maxSize && file.size > maxSize) return false;
    if (allowedTypes?.length) {
        const fileExt = getFileExtension(file.name);
        const mimeType = file.type;
        const isValidExtension = allowedTypes.some(type =>
            FILE_EXTENSIONS[type as keyof typeof FILE_EXTENSIONS]?.some(ext =>
                ext.slice(1) === fileExt
            )
        );
        const isValidMimeType = allowedTypes.some(type =>
            COMMON_MIME_TYPES[type as keyof typeof COMMON_MIME_TYPES]?.some(mime =>
                mime === mimeType
            )
        );
        return isValidExtension || isValidMimeType;
    }
    return true;
};

export const getFileTypeInfo = (fileName: string): FileTypeInfo => {
    const category = getFileCategory(fileName);
    const ext = getFileExtension(fileName);

    return {
        id: ext,
        name: fileName,
        extensions: [`.${ext}`],
        category,
        mimeTypes: [], // Would be populated based on extension
        icon: FILE_ICONS[category],
        description: `${category.toLowerCase()} file`,
    };
};

export const formatLastModified = (date: string | number): string => {
    return new Date(date).toLocaleString();
};

export const isPreviewable = (fileName: string): boolean => {
    const category = getFileCategory(fileName);
    return ['IMAGE', 'CODE', 'DOCUMENT', 'DATA'].includes(category);
};


export function processStorageItem(
    item: FileObject | Bucket,
    currentPath: string[]
): StorageItem {
    // Safely handle potentially missing properties
    const metadata = item.metadata || {};
    const extension = getFileExtension(item.name);
    const basename = item.name.replace(extension, '');
    const category = getFileCategory(item.name);
    const fileTypeInfo = getFileTypeInfo(item.name);
    const IconComponent = FILE_ICONS[category];

    return {
        id: item.id || `file-${item.name}`,
        name: item.name,
        path: [...currentPath, item.name].join('/'),
        isFolder: false,

        extension,
        basename,

        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString(),
        lastAccessedAt: item.last_accessed_at || new Date().toISOString(),

        category,
        fileType: {
            ...fileTypeInfo,
            icon: IconComponent,
            mimeTypes: [metadata.mimetype || 'application/octet-stream'],
        },

        size: metadata.size || 0,
        metadata: {
            mimetype: metadata.mimetype || 'application/octet-stream',
            size: metadata.size || 0,
            lastModified: metadata.lastModified || new Date().toISOString(),
            cacheControl: metadata.cacheControl || 'no-cache',
            contentLength: metadata.contentLength || 0,
            httpStatusCode: metadata.httpStatusCode || 200,
            isDirectory: false,
        },
    };
}

export function processStorageList(
    data: SupabaseStorageItem[],
    currentPath: string[]
): StorageItem[] {
    if (!Array.isArray(data)) {
        console.error('Invalid data provided to processStorageList:', data);
        return [];
    }

    const items = new Map<string, StorageItem>();
    const prefix = currentPath.join('/');

    data.forEach(item => {
        if (!item || typeof item.name !== 'string') {
            console.warn('Invalid item in storage list:', item);
            return;
        }

        const relativePath = item.name.startsWith(prefix)
            ? item.name.slice(prefix.length + (prefix.length > 0 ? 1 : 0))
            : item.name;

        const parts = relativePath.split('/').filter(Boolean);

        if (parts.length > 1) {
            // This is an item in a subfolder
            const folderName = parts[0];
            if (!items.has(folderName)) {
                // Create folder entry
                items.set(folderName, {
                    id: `folder-${folderName}`,
                    name: folderName,
                    path: [...currentPath, folderName].join('/'),
                    isFolder: true,
                    extension: '',
                    basename: folderName,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastAccessedAt: new Date().toISOString(),
                    category: 'UNKNOWN',
                    fileType: {
                        id: 'folder',
                        name: 'Folder',
                        extensions: [],
                        mimeTypes: ['application/x-directory'],
                        icon: FolderIcon,
                        category: 'UNKNOWN',
                        description: 'Folder',
                    },
                    size: 0,
                    metadata: {
                        mimetype: 'application/x-directory',
                        isDirectory: true,
                        childCount: 0,
                        size: 0,
                        lastModified: new Date().toISOString(),
                        cacheControl: 'no-cache',
                        contentLength: 0,
                        httpStatusCode: 200,
                    },
                });
            }
            // Update folder child count
            const folder = items.get(folderName)!;
            folder.metadata.childCount = (folder.metadata.childCount || 0) + 1;
        } else if (parts[0] && !parts[0].endsWith('.keep')) {
            // This is a direct file (not a .keep file)
            try {
                items.set(parts[0], processStorageItem(item, currentPath));
            } catch (error) {
                console.error(`Error processing item ${item.name}:`, error);
            }
        }
    });

    // Convert to array and sort
    return Array.from(items.values()).sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
    });
}

export const getItemIcon = (item: StorageItem): React.ReactNode => {
    if (item.isFolder) {
        return <FolderIcon className="h-4 w-4"/>;
    }
    return getFileIcon(item.name);
};

export const getPreviewUrl = (item: StorageItem, storage: any): string | null => {
    if (!item.isFolder && isPreviewable(item.name)) {
        const {data} = storage.getPublicUrl(item.path);
        return data?.publicUrl || null;
    }
    return null;
};

export const getItemActions = (item: StorageItem): string[] => {
    const commonActions = ['rename', 'move', 'copy', 'delete'];

    if (item.isFolder) {
        return ['open', ...commonActions];
    }

    const actions = [...commonActions];

    if (isPreviewable(item.name)) {
        actions.unshift('preview');
    }

    actions.unshift('download');

    return actions;
};

export const validateOperation = (
    operation: string,
    item: StorageItem,
    validation?: FileTypeValidation
): boolean => {
    switch (operation) {
        case 'preview':
            return !item.isFolder && isPreviewable(item.name);
        case 'download':
            return !item.isFolder;
        case 'move':
        case 'copy':
        case 'rename':
        case 'delete':
            return true;
        case 'upload':
            return item.isFolder;
        default:
            return false;
    }
};

export const formatItemDetails = (item: StorageItem): Record<string, string> => {
    return {
        Name: item.name,
        Type: item.isFolder ? 'Folder' : item.fileType.description,
        Size: item.isFolder
            ? `${item.metadata.childCount || 0} items`
            : formatFileSize(item.size),
        'Last Modified': formatLastModified(item.updatedAt),
        Location: item.path,
        ...(item.isFolder ? {} : {
            'File Type': item.extension || 'No extension',
            'MIME Type': item.metadata.mimetype || 'Unknown'
        })
    };
};
