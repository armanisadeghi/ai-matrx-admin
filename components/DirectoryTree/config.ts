// components/DirectoryTree/config.ts
import {
    FileJson, FileText, FileCode, FileImage,
    FileInput, FileVideo, FileSpreadsheet, File,
    FileAudio,
    Table2,
    FileArchive
} from 'lucide-react';
import {
    FileTypeInfo,
    FileCategory,
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
    IconBrandPython,
} from "@tabler/icons-react";
import React from "react";
import {TwoColorPythonIcon} from "@/components/DirectoryTree/custom-icons";

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


export type FileTypeDetails = {
    category: FileCategory;
    subCategory: string;
    icon: React.ComponentType;
    color?: string
}

export const FILE_EXTENSIONS_LOOKUP: Record<string, FileTypeDetails> = {
    js: {category: "CODE", subCategory: "JAVASCRIPT", icon: IconFileTypeJs, color: 'text-amber-500'},
    jsx: {category: "CODE", subCategory: "JAVASCRIPT", icon: IconFileTypeJsx, color: 'text-amber-500'},
    mjs: {category: "CODE", subCategory: "JAVASCRIPT", icon: IconFileTypeJs, color: 'text-amber-500'},
    ts: {category: "CODE", subCategory: "TYPESCRIPT", icon: IconFileTypeTs, color: 'text-sky-500'},
    tsx: {category: "CODE", subCategory: "TYPESCRIPT", icon: IconFileTypeTsx, color: 'text-sky-500'},
    dts: {category: "CODE", subCategory: "TYPESCRIPT", icon: IconFileTypeTs, color: 'text-sky-500'},
    py: {category: "CODE", subCategory: "PYTHON", icon: TwoColorPythonIcon, color: ''},
    pyw: {category: "CODE", subCategory: "PYTHON", icon: TwoColorPythonIcon, color: ''},
    pyx: {category: "CODE", subCategory: "PYTHON", icon: TwoColorPythonIcon, color: ''},
    pxd: {category: "CODE", subCategory: "PYTHON", icon: TwoColorPythonIcon, color: ''},
    pxi: {category: "CODE", subCategory: "PYTHON", icon: IconBrandPython},
    html: {category: "CODE", subCategory: "WEB", icon: IconFileTypeHtml},
    htm: {category: "CODE", subCategory: "WEB", icon: IconFileTypeHtml},
    css: {category: "CODE", subCategory: "WEB", icon: IconFileTypeCss},
    scss: {category: "CODE", subCategory: "WEB", icon: IconFileTypeCss},
    sass: {category: "CODE", subCategory: "WEB", icon: IconFileTypeCss},
    less: {category: "CODE", subCategory: "WEB", icon: IconFileTypeCss},
    json: {category: "CODE", subCategory: "CONFIG", icon: FileJson},
    yaml: {category: "CODE", subCategory: "CONFIG", icon: FileCode},
    yml: {category: "CODE", subCategory: "CONFIG", icon: FileCode},
    toml: {category: "CODE", subCategory: "CONFIG", icon: FileCode},
    ini: {category: "CODE", subCategory: "CONFIG", icon: FileCode},
    env: {category: "CODE", subCategory: "CONFIG", icon: FileCode},
    md: {category: "CODE", subCategory: "MARKDOWN", icon: FileCode},
    mdx: {category: "CODE", subCategory: "MARKDOWN", icon: FileCode},
    markdown: {category: "CODE", subCategory: "MARKDOWN", icon: FileCode},
    doc: {category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypeDoc},
    docx: {category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypeDocx},
    xls: {category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypeXls},
    xlsx: {category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypeXls},
    ppt: {category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypePpt},
    pptx: {category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypePpt},
    gdoc: {category: "DOCUMENT", subCategory: "GOOGLE", icon: File},
    gsheet: {category: "DOCUMENT", subCategory: "GOOGLE", icon: Table2},
    gslide: {category: "DOCUMENT", subCategory: "GOOGLE", icon: File},
    txt: {category: "DOCUMENT", subCategory: "TEXT", icon: IconFileTypeTxt},
    rtf: {category: "DOCUMENT", subCategory: "TEXT", icon: File},
    pdf: {category: "DOCUMENT", subCategory: "TEXT", icon: IconFileTypePdf},
    note: {category: "DOCUMENT", subCategory: "NOTES", icon: File},
    mp3: {category: "AUDIO", subCategory: "BASIC", icon: FileAudio},
    wav: {category: "AUDIO", subCategory: "BASIC", icon: FileAudio},
    ogg: {category: "AUDIO", subCategory: "BASIC", icon: FileAudio},
    m4a: {category: "AUDIO", subCategory: "BASIC", icon: FileAudio},
    webm: {category: "AUDIO", subCategory: "VOICE", icon: FileAudio},
    aac: {category: "AUDIO", subCategory: "VOICE", icon: FileAudio},
    mp4a: {category: "AUDIO", subCategory: "VOICE", icon: FileAudio},
    mid: {category: "AUDIO", subCategory: "MIDI", icon: FileAudio},
    midi: {category: "AUDIO", subCategory: "MIDI", icon: FileAudio},
    m3u: {category: "AUDIO", subCategory: "PLAYLIST", icon: FileAudio},
    m3u8: {category: "AUDIO", subCategory: "PLAYLIST", icon: FileAudio},
    pls: {category: "AUDIO", subCategory: "PLAYLIST", icon: FileAudio},
    jpg: {category: "IMAGE", subCategory: "BASIC", icon: IconFileTypeJpg},
    jpeg: {category: "IMAGE", subCategory: "BASIC", icon: IconFileTypeJpg},
    png: {category: "IMAGE", subCategory: "BASIC", icon: IconFileTypePng},
    gif: {category: "IMAGE", subCategory: "BASIC", icon: IconGif},
    webp: {category: "IMAGE", subCategory: "BASIC", icon: FileImage},
    svg: {category: "IMAGE", subCategory: "VECTOR", icon: FileImage},
    ai: {category: "IMAGE", subCategory: "VECTOR", icon: FileImage},
    eps: {category: "IMAGE", subCategory: "VECTOR", icon: FileImage},
    raw: {category: "IMAGE", subCategory: "RAW", icon: FileImage},
    cr2: {category: "IMAGE", subCategory: "RAW", icon: FileImage},
    nef: {category: "IMAGE", subCategory: "RAW", icon: FileImage},
    arw: {category: "IMAGE", subCategory: "RAW", icon: FileImage},
    psd: {category: "IMAGE", subCategory: "DESIGN", icon: FileImage},
    xcf: {category: "IMAGE", subCategory: "DESIGN", icon: FileImage},
    sketch: {category: "IMAGE", subCategory: "DESIGN", icon: FileImage},
    mp4: {category: "VIDEO", subCategory: "BASIC", icon: FileVideo},
    mov: {category: "VIDEO", subCategory: "BASIC", icon: FileVideo},
    zip: {category: "ARCHIVE", subCategory: "COMPRESSED", icon: IconFileTypeZip},
    rar: {category: "ARCHIVE", subCategory: "COMPRESSED", icon: FileArchive},
    '7z': {category: "ARCHIVE", subCategory: "COMPRESSED", icon: FileArchive},
    tar: {category: "ARCHIVE", subCategory: "COMPRESSED", icon: FileArchive},
    gz: {category: "ARCHIVE", subCategory: "COMPRESSED", icon: FileArchive},
    iso: {category: "ARCHIVE", subCategory: "DISK_IMAGE", icon: File},
    img: {category: "ARCHIVE", subCategory: "DISK_IMAGE", icon: File},
    dmg: {category: "ARCHIVE", subCategory: "DISK_IMAGE", icon: File},
    csv: {category: "DATA", subCategory: "STRUCTURED", icon: IconFileTypeCsv},
    xml: {category: "DATA", subCategory: "STRUCTURED", icon: IconFileTypeXml},
    sqlite: {category: "DATA", subCategory: "STRUCTURED", icon: File},
    db: {category: "DATA", subCategory: "STRUCTURED", icon: File},
    cfg: {category: "DATA", subCategory: "CONFIG", icon: File},
    conf: {category: "DATA", subCategory: "CONFIG", icon: File},
}

export const DEFAULT_ICONS = {
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

for (const key in FILE_EXTENSIONS_LOOKUP) {
    const entry = FILE_EXTENSIONS_LOOKUP[key];
    if (entry.color === undefined || entry.color === '') {
        entry.color = 'text-gray-500';
    }
}

export const getFileDetails = (fileName: string): FileTypeDetails => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const lookup = FILE_EXTENSIONS_LOOKUP[ext];
    if (lookup) {
        return lookup;
    }
    return {category: "UNKNOWN", subCategory: "UNKNOWN", icon: File, color: 'text-gray-500'};
};

export type FileCategorySubCategory = {
    category: FileCategory;
    subCategory: string;
}

export const COMMON_MIME_TYPES_LOOKUP: Record<string, FileCategorySubCategory> = {
    'application/javascript': {category: "CODE", subCategory: "JAVASCRIPT"},
    'text/javascript': {category: "CODE", subCategory: "JAVASCRIPT"},
    'application/typescript': {category: "CODE", subCategory: "TYPESCRIPT"},
    'text/typescript': {category: "CODE", subCategory: "TYPESCRIPT"},
    'text/x-python': {category: "CODE", subCategory: "PYTHON"},
    'application/x-python': {category: "CODE", subCategory: "PYTHON"},
    'application/json': {category: "CODE", subCategory: "JSON"},
    'text/html': {category: "CODE", subCategory: "HTML"},
    'text/css': {category: "CODE", subCategory: "CSS"},
    'text/markdown': {category: "CODE", subCategory: "MARKDOWN"},
    'application/xml': {category: "CODE", subCategory: "XML"},
    'text/xml': {category: "CODE", subCategory: "XML"},
    'application/yaml': {category: "CODE", subCategory: "YAML"},
    'text/yaml': {category: "CODE", subCategory: "YAML"},
    'text/plain': {category: "CODE", subCategory: "PLAIN"},

    // Documentation & Notes
    'application/msword': {category: "DOCUMENT", subCategory: "WORD"},
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        category: "DOCUMENT",
        subCategory: "WORD"
    },
    'application/vnd.ms-excel': {category: "DOCUMENT", subCategory: "EXCEL"},
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {category: "DOCUMENT", subCategory: "EXCEL"},
    'application/vnd.ms-powerpoint': {category: "DOCUMENT", subCategory: "POWERPOINT"},
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
        category: "DOCUMENT",
        subCategory: "POWERPOINT"
    },
    'application/vnd.google-apps.document': {category: "DOCUMENT", subCategory: "GOOGLE_DOC"},
    'application/vnd.google-apps.spreadsheet': {category: "DOCUMENT", subCategory: "GOOGLE_SHEET"},
    'application/vnd.google-apps.presentation': {category: "DOCUMENT", subCategory: "GOOGLE_SLIDES"},
    'application/pdf': {category: "DOCUMENT", subCategory: "PDF"},
    'application/rtf': {category: "DOCUMENT", subCategory: "RTF"},

    // Media Files
    'audio/mpeg': {category: "AUDIO", subCategory: "BASIC"},
    'audio/ogg': {category: "AUDIO", subCategory: "BASIC"},
    'audio/wav': {category: "AUDIO", subCategory: "BASIC"},
    'audio/webm': {category: "AUDIO", subCategory: "VOICE"},
    'audio/aac': {category: "AUDIO", subCategory: "VOICE"},
    'audio/mp4': {category: "AUDIO", subCategory: "VOICE"},
    'audio/midi': {category: "AUDIO", subCategory: "MIDI"},
    'audio/x-midi': {category: "AUDIO", subCategory: "MIDI"},

    // Image Files
    'image/jpeg': {category: "IMAGE", subCategory: "BASIC"},
    'image/png': {category: "IMAGE", subCategory: "BASIC"},
    'image/gif': {category: "IMAGE", subCategory: "BASIC"},
    'image/webp': {category: "IMAGE", subCategory: "BASIC"},
    'image/svg+xml': {category: "IMAGE", subCategory: "VECTOR"},

    // Archives & Data
    'application/zip': {category: "ARCHIVE", subCategory: "COMPRESSED"},
    'application/x-rar-compressed': {category: "ARCHIVE", subCategory: "COMPRESSED"},
    'application/x-7z-compressed': {category: "ARCHIVE", subCategory: "COMPRESSED"},
    'application/x-iso9660-image': {category: "ARCHIVE", subCategory: "DISK_IMAGE"},

    // Add more MIME types as needed
};

export const getFileCategoryByMimeType = (mimeType: string): FileCategorySubCategory => {
    const lookup = COMMON_MIME_TYPES_LOOKUP[mimeType];
    if (lookup) {
        return lookup;
    }
    return {category: "UNKNOWN", subCategory: "UNKNOWN"}
};


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
    const {sorting, filter} = config;

    return items.sort(([keyA, valueA], [keyB, valueB]) => {
        const isADirectory = valueA !== null && typeof valueA === 'object';
        const isBDirectory = valueB !== null && typeof valueB === 'object';

        // Handle folders first
        if (sorting.foldersFirst && isADirectory !== isBDirectory) {
            return isADirectory ? -1 : 1;
        }

        // Natural sorting for names
        if (sorting.natural) {
            return keyA.localeCompare(keyB, undefined, {numeric: true});
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
    const {filter} = config;
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

export const isCodeFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return Object.values(FILE_EXTENSIONS.CODE)
        .flat()
        .some(validExt => validExt.slice(1) === ext);
};

export const isImageFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return Object.values(FILE_EXTENSIONS.IMAGE)
        .flat()
        .some(validExt => validExt.slice(1) === ext);
};

export const isVideoFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return Object.values(FILE_EXTENSIONS.VIDEO)
        .flat()
        .some(validExt => validExt.slice(1) === ext);
};

export const isAudioFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return Object.values(FILE_EXTENSIONS.AUDIO)
        .flat()
        .some(validExt => validExt.slice(1) === ext);
};

export const isDocumentFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return Object.values(FILE_EXTENSIONS.DOCUMENT)
        .flat()
        .some(validExt => validExt.slice(1) === ext);
};

export const isArchiveFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return Object.values(FILE_EXTENSIONS.ARCHIVE)
        .flat()
        .some(validExt => validExt.slice(1) === ext);
};

export const isDataFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return Object.values(FILE_EXTENSIONS.DATA)
        .flat()
        .some(validExt => validExt.slice(1) === ext);
};


export const isFolder = (fileName: string): boolean => {
    return !fileName.includes('.');
};

export const isPreviewableFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return ENHANCED_DEFAULT_CONFIG.preview.supportedTypes.includes(`.${ext}`);
};

export const canPreviewFile = (item: { name: string; size: number }, category: FileCategory): boolean => {
    // Size check
    const maxPreviewSize = ENHANCED_DEFAULT_CONFIG.preview.maxSize;
    if (item.size > maxPreviewSize) return false;

    // Check supported categories and extensions
    switch (category) {
        case 'CODE':
        case 'DOCUMENT':
            return true;
        case 'IMAGE':
            return ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(
                item.name.split('.').pop()?.toLowerCase() || ''
            );
        case 'VIDEO':
            return false; // Video preview might need special handling
        case 'AUDIO':
            return false; // Audio preview might need special handling
        default:
            return false;
    }
};