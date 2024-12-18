// components/DirectoryTree/config.ts
import {
    FileJson, FileText, FileCode, FileImage,
    FileInput, FileVideo, FileSpreadsheet, File
} from 'lucide-react';
import {
    FileTypeInfo,
    FileCategory,
    COMMON_MIME_TYPES,
    FILE_EXTENSIONS
} from '@/types/file-operations.types';

import {
    IconFileTypeBmp,
    IconGif,
    IconFileTypeJpg,
    IconFileTypePng,
    IconFileTypeCsv,
    IconFileTypeDoc,
    IconFileTypeDocx,
    IconFileTypeHtml,
    IconFileTypePdf,
    IconFileTypePhp,
    IconFileTypePpt,
    IconFileTypeTxt,
    IconFileTypeXls,
    IconFileTypeXml,
    IconFileTypeZip,
    IconFileTypeCss,
    IconFileTypeJs,
    IconFileTypeJsx,
    IconFileTypeRs,
    IconFileTypeSql,
    IconFileTypeTs,
    IconFileTypeTsx,
} from "@tabler/icons-react";

export const FILE_ICONS = {
    '.bmp': IconFileTypeBmp,
    '.gif': IconGif,
    '.jpg': IconFileTypeJpg,
    '.jpeg': IconFileTypeJpg,
    '.png': IconFileTypePng,

    // Document files
    '.csv': IconFileTypeCsv,
    '.doc': IconFileTypeDoc,
    '.docx': IconFileTypeDocx,
    '.html': IconFileTypeHtml,
    '.pdf': IconFileTypePdf,
    '.php': IconFileTypePhp,
    '.ppt': IconFileTypePpt,
    '.txt': IconFileTypeTxt,
    '.xls': IconFileTypeXls,
    '.xml': IconFileTypeXml,
    '.zip': IconFileTypeZip,

    // Code files
    '.css': IconFileTypeCss,
    '.js': IconFileTypeJs,
    '.jsx': IconFileTypeJsx,
    '.json': FileJson,
    '.rs': IconFileTypeRs,
    '.sql': IconFileTypeSql,
    '.ts': IconFileTypeTs,
    '.tsx': IconFileTypeTsx,

    // Config files
    '.yaml': FileCode,
    '.yml': FileCode,
    '.env': FileCode,

    '.mp4': FileVideo,
    '.mov': FileVideo,

    // Default
    default: File
} as const;

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

export const DEFAULT_CONFIG: DirectoryTreeConfig = {
    excludeFiles: [],
    excludeDirs: [],
    hideHiddenFiles: false,
    showIcons: true,
    indentSize: 24,
    sortFoldersFirst: true,
};



export interface FileTypeConfig extends FileTypeInfo {
    icon: React.ComponentType;
    category: FileCategory;
    patterns: string[];
    mimeTypes: string[];
    description: string;
    color?: string;
    preview?: boolean;
    editable?: boolean;
}

export const ENHANCED_FILE_ICONS = {
    // Preserve existing specific file extensions
    ...FILE_ICONS,

    // Add category-based icons
    categories: {
        CODE: {
            DEFAULT: FileCode,
            JAVASCRIPT: IconFileTypeJs,
            TYPESCRIPT: IconFileTypeTs,
            PYTHON: FileCode,
            JSON: FileJson,
            HTML: IconFileTypeHtml,
            CSS: IconFileTypeCss,
            MARKDOWN: FileText,
        },
        DOCUMENT: {
            DEFAULT: FileText,
            WORD: IconFileTypeDoc,
            EXCEL: IconFileTypeXls,
            POWERPOINT: IconFileTypePpt,
            PDF: IconFileTypePdf,
        },
        AUDIO: {
            DEFAULT: FileInput,
        },
        IMAGE: {
            DEFAULT: FileImage,
            JPG: IconFileTypeJpg,
            PNG: IconFileTypePng,
            GIF: IconGif,
            BMP: IconFileTypeBmp,
        },
        VIDEO: {
            DEFAULT: FileVideo,
        },
        ARCHIVE: {
            DEFAULT: IconFileTypeZip,
        },
        DATA: {
            DEFAULT: FileJson,
            CSV: IconFileTypeCsv,
            XML: IconFileTypeXml,
            SQL: IconFileTypeSql,
        },
        UNKNOWN: {
            DEFAULT: File,
        }
    } as const
};

// Enhanced configuration interface
export interface EnhancedDirectoryTreeConfig extends DirectoryTreeConfig {
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

// Enhanced default configuration
export const ENHANCED_DEFAULT_CONFIG: EnhancedDirectoryTreeConfig = {
    ...DEFAULT_CONFIG,
    categorization: {
        enabled: true,
        groupByCategory: false,
        showCategoryHeaders: false,
        categories: ['CODE', 'DOCUMENT', 'IMAGE', 'AUDIO', 'VIDEO', 'DATA', 'ARCHIVE'],
    },
    preview: {
        enabled: true,
        maxSize: 5 * 1024 * 1024, // 5MB
        supportedTypes: [
            ...FILE_EXTENSIONS.CODE.JAVASCRIPT,
            ...FILE_EXTENSIONS.CODE.TYPESCRIPT,
            ...FILE_EXTENSIONS.CODE.PYTHON,
            ...FILE_EXTENSIONS.CODE.WEB,
            ...FILE_EXTENSIONS.IMAGE.BASIC,
            ...FILE_EXTENSIONS.DOCUMENT.TEXT,
        ],
    },
    sorting: {
        by: 'name',
        direction: 'asc',
        natural: true,
        foldersFirst: true,
    },
    filter: {
        hideHiddenFiles: true,
        excludePatterns: [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
        ],
        includeMimeTypes: [],
        excludeMimeTypes: [],
        maxDepth: undefined,
    },
    display: {
        showIcons: true,
        showSize: true,
        showDate: true,
        showExtensions: true,
        indentSize: 24,
        compactMode: false,
    },
    contextMenu: {
        enabled: true,
        actions: {
            preview: true,
            download: true,
            copy: true,
            delete: true,
            rename: true,
        }
    }
};

// Helper functions for the enhanced system
export const getFileCategory = (filename: string): FileCategory => {
    const ext = filename.toLowerCase().split('.').pop() || '';

    for (const [category, subcategories] of Object.entries(FILE_EXTENSIONS)) {
        for (const extensions of Object.values(subcategories)) {
            if (extensions.some(e => e.slice(1) === ext)) {
                return category as FileCategory;
            }
        }
    }

    return 'UNKNOWN';
};

type CategoryType = keyof typeof FILE_EXTENSIONS;

export const getEnhancedFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const specificIcon = FILE_ICONS[`.${ext}` as keyof typeof FILE_ICONS];
    if (specificIcon) return specificIcon;

    const category = getFileCategory(filename);
    const categoryIcons = ENHANCED_FILE_ICONS.categories[category];

    const categoryExtensions = FILE_EXTENSIONS[category as CategoryType] || {};
    for (const [subcat, extensions] of Object.entries(categoryExtensions)) {
        if ((extensions as readonly string[]).some(e => e.slice(1) === ext)) {
            return categoryIcons[subcat as keyof typeof categoryIcons] || categoryIcons.DEFAULT;
        }
    }

    return categoryIcons.DEFAULT || File;
};


// Sorting function that respects the enhanced config
export const sortItems = (
    items: [string, any][],
    config: EnhancedDirectoryTreeConfig
): [string, any][] => {
    const { sorting, filter } = config;

    return items.sort(([keyA, valueA], [keyB, valueB]) => {
        const isADirectory = valueA !== null && typeof valueA === 'object';
        const isBDirectory = valueB !== null && typeof valueB === 'object';

        // Handle folders first
        if (sorting.foldersFirst && isADirectory !== isBDirectory) {
            return isADirectory ? -1 : 1;
        }

        // Natural sorting for names
        if (sorting.natural) {
            return keyA.localeCompare(keyB, undefined, { numeric: true });
        }

        // Regular sorting
        const compareResult = keyA.localeCompare(keyB);
        return sorting.direction === 'asc' ? compareResult : -compareResult;
    });
};

// Filter function that respects the enhanced config
export const shouldShowItem = (
    name: string,
    isDirectory: boolean,
    config: EnhancedDirectoryTreeConfig
): boolean => {
    const { filter } = config;
    if (filter.hideHiddenFiles && name.startsWith('.')) {
        return false;
    }
    if (filter.excludePatterns.some(pattern => {
        const regexPattern = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*\*/g, '__GLOBSTAR__')
            .replace(/\*/g, '[^/]*')
            .replace(/__GLOBSTAR__/g, '.*');

        try {
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(name);
        } catch (e) {
            console.warn(`Invalid pattern: ${pattern}`, e);
            return false;
        }
    })) {
        return false;
    }
    if (!isDirectory && filter.includeMimeTypes?.length) {
        const ext = name.toLowerCase().split('.').pop() || '';
        const mimeType = COMMON_MIME_TYPES[getFileCategory(name)];
        if (!mimeType) return false;
    }

    return true;
};