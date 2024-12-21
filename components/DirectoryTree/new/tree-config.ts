import React from "react";

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
export const DEFAULT_CONFIG: DirectoryTreeConfig = {
    excludeFiles: [],
    excludeDirs: [],
    hideHiddenFiles: false,
    showIcons: true,
    indentSize: 24,
    sortFoldersFirst: true,
};



export interface ContextMenuActions {
    preview?: boolean;
    download?: boolean;
    copy?: boolean;
    delete?: boolean;
    rename?: boolean;
}


export interface DirectoryTreeConfig {
    excludeFiles?: string[];      // Files to exclude (exact matches or patterns)
    excludeDirs?: string[];       // Directories to exclude
    hideHiddenFiles?: boolean;    // Whether to hide files starting with .
    showIcons?: boolean;          // Whether to show file type icons
    indentSize?: number;         // Size of each indent level in pixels
    sortFoldersFirst?: boolean;  // Whether to sort folders before files
    contextMenu?: {
        enabled: boolean;
        actions: ContextMenuActions;
    }
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

export interface VisualConfig {
    indentSize?: number;

    showIcons?: boolean;
    showSize?: boolean;
    showDate?: boolean;
    showExtensions?: boolean;
    compactMode?: boolean;
}

export interface TreeConfig {
    visualConfig?: VisualConfig;
    fileConfig?: FileConfig;
    folderConfig?: FolderConfig;

    




    sortFoldersFirst?: boolean;

    contextMenu?: {
        enabled: boolean;
        actions: ContextMenuActions;
    }



    categorization?: {
        enabled: boolean;
        groupByCategory?: boolean;
        showCategoryHeaders?: boolean;
        categories?: FileCategory[];
    };
    preview?: {
        enabled: boolean;
        maxSize?: number;
        supportedTypes?: string[];
    };
    sorting?: {
        by: 'name' | 'date' | 'size' | 'type';
        direction: 'asc' | 'desc';
        natural: boolean;
        foldersFirst: boolean;
    };
    filter?: {
        hideHiddenFiles: boolean;
        excludePatterns: string[];
        includeMimeTypes?: string[];
        excludeMimeTypes?: string[];
        maxDepth?: number;
    };
    display?: {
        showIcons: boolean;
        showSize: boolean;
        showDate: boolean;
        showExtensions: boolean;
        indentSize: number;
        compactMode: boolean;
    };
}

