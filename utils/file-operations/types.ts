import React from "react";

export interface StorageMetadata {
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

export type IconComponent = React.ComponentType<{ className?: string }>;

export type FileCategory =
    | 'CODE'
    | 'DOCUMENT'
    | 'AUDIO'
    | 'IMAGE'
    | 'VIDEO'
    | 'ARCHIVE'
    | 'DATA'
    | 'UNKNOWN'

export type FileTypeDetails = {
    category: FileCategory;
    subCategory: string;
    icon: IconComponent;
    color?: string
    canPreview?: boolean;
}


export interface VisualConfig {
    indentSize?: number;
    showIcons?: boolean;
    showSize?: boolean;
    showDate?: boolean;
    showExtensions?: boolean;
    compactMode?: boolean;
}

export interface sortConfig {
    by: 'name' | 'date' | 'size' | 'type';
    direction: 'asc' | 'desc';
    natural: boolean;
    foldersFirst: boolean;
}

export interface ContextMenuActions {
    preview?: boolean;
    download?: boolean;
    copy?: boolean;
    delete?: boolean;
    rename?: boolean;
}

export interface FileConfig {
    excludeFiles?: string[];
    hideHiddenFiles?: boolean;
    customIcons?: boolean;
}

export interface FolderConfig {
    excludeDirs?: string[];
    showFileCount?: boolean;
    customIcons?: boolean;
}
export interface CategoryConfig {
    enabled: boolean;
    groupByCategory: boolean;
    showCategoryHeaders: boolean;
    categories: FileCategory[];
}

export interface PreviewConfig {
    enabled: boolean;
    maxSize?: number;
    supportedTypes?: string[];
}

export interface FilterConfig {
    hideHiddenFiles: boolean;
    excludePatterns: string[];
    includeMimeTypes?: string[];
    excludeMimeTypes?: string[];
    maxDepth?: number;
}

export interface FeatureConfig {
    search: boolean;
    filter: boolean;
    sort: boolean;
    categorization: boolean;
    preview: boolean;
    contextMenu: boolean;
}

export interface TreeConfig {
    featureConfig: FeatureConfig;
    visualConfig?: VisualConfig;
    fileConfig?: FileConfig;
    folderConfig?: FolderConfig;
    sortConfig?: sortConfig;
    contextMenuConfig?: ContextMenuActions;
    filterConfig?: FilterConfig;
    categorizationConfig?: CategoryConfig;
    previewConfig?: PreviewConfig;
}


export interface FileTypeInfo {
    id: string;
    name: string;
    extension: string;
    mimeType: string;
    category: FileCategory;
    subCategory?: string;
    icon: IconComponent;
    color?: string;
    description?: string;
    canPreview?: boolean;
}

export interface FolderTypeInfo {
    name: string;
    icon: IconComponent;
    category: 'FOLDER';
    subCategory?: string;
    description?: string;
    color?: string;
}

export interface BucketStructure {
    path: string;
    type: string;
    details?: FileTypeDetails;
    metadata?: StorageMetadata;
    id?: string;
    updated_at?: string;
    created_at?: string;
    last_accessed_at?: string;
}

export interface StructureWithContents {
    contents: BucketStructure[];
    [key: string]: any;
}

export const isStructureWithContents = (value: unknown): value is StructureWithContents => {
    return value !== null
        && typeof value === 'object'
        && 'contents' in value
        && Array.isArray((value as StructureWithContents).contents);
};

export interface BucketTreeStructure {
    name: string;
    contents: BucketStructure[];
}


