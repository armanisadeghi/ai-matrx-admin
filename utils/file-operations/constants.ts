import React from "react";
import { File, FileArchive, FileAudio, FileCode, FileImage, FileJson, FileVideo, Table2, Folder, Lock, Package, Globe } from "lucide-react";
import {
    IconBlocks,
    IconBrandAbstract,
    IconBrandGoogle,
    IconBrandPython,
    IconBrandWindows,
    IconDeviceFloppy,
    IconFileCode,
    IconFileDatabase,
    IconFileText,
    IconFileTypeCss,
    IconFileTypeDoc,
    IconFileTypeDocx,
    IconFileTypeHtml,
    IconFileTypeJpg,
    IconFileTypePng,
    IconFileTypePpt,
    IconFileTypeTxt,
    IconFileTypeXls,
    IconFileTypeXml,
    IconFileTypeZip,
    IconFileUnknown,
    IconFileZip,
    IconGif,
    IconImageInPicture,
    IconMarkdown,
    IconMovie,
    IconPhotoScan,
    IconPlaylist,
    IconRecordMail,
    IconSettingsCheck,
    IconSettingsSearch,
    IconTextCaption,
    IconVector,
    IconVideo,
    IconVideoPlus,
    IconVolume2,
    IconWorldWww,
} from "@tabler/icons-react";
import { SiTypescript, SiJavascript } from "react-icons/si";
import { FaFilePdf } from "react-icons/fa";
import { GrDocumentCsv } from "react-icons/gr";
import { GrDocumentTxt } from "react-icons/gr";

import { TwoColorPythonIcon } from "@/components/DirectoryTree/custom-icons";
import {
    CategoryConfig,
    ContextMenuActions,
    FeatureConfig,
    FileConfig,
    FilterConfig,
    FolderConfig,
    PreviewConfig,
    sortConfig,
    VisualConfig,
    TreeConfig,
    FileTypeDetails,
    FileCategory,
    IconComponent,
    FolderTypeInfo,
    FolderTypeDetails,
    StorageMetadata,
} from "./types";

export const FEATURE_DEFAULTS: FeatureConfig = {
    search: true,
    filter: true,
    sort: true,
    contextMenu: true,
    categorization: false,
    preview: false,
};

export const VISUAL_DEFAULTS: VisualConfig = {
    indentSize: 24,
    showIcons: true,
    showSize: false,
    showDate: false,
    showExtensions: false,
    compactMode: false,
};

export const SORT_DEFAULTS: sortConfig = {
    by: "name",
    direction: "asc",
    natural: true,
    foldersFirst: true,
};

export const CONTEXT_MENU_DEFAULTS: ContextMenuActions = {
    preview: true,
    download: true,
    copy: true,
    delete: true,
    rename: true,
};

export const FILE_DEFAULTS: FileConfig = {
    excludeFiles: [],
    hideHiddenFiles: false,
    customIcons: false,
};

export const FOLDER_DEFAULTS: FolderConfig = {
    excludeDirs: [],
    showFileCount: false,
    customIcons: false,
};

export const CATEGORY_DEFAULTS: CategoryConfig = {
    enabled: true,
    groupByCategory: true,
    showCategoryHeaders: true,
    categories: ["CODE", "DOCUMENT", "AUDIO", "IMAGE", "VIDEO", "ARCHIVE", "DATA", "UNKNOWN", "FOLDER"],
};

export const PREVIEW_DEFAULTS: PreviewConfig = {
    enabled: true,
    maxSize: 10,
    supportedTypes: [],
};

export const FILTER_DEFAULTS: FilterConfig = {
    hideHiddenFiles: false,
    excludePatterns: [],
    includeMimeTypes: [],
    excludeMimeTypes: [],
    maxDepth: 0,
};

export const DEFAULT_CONFIG: TreeConfig = {
    featureConfig: FEATURE_DEFAULTS,
    visualConfig: VISUAL_DEFAULTS,
    fileConfig: FILE_DEFAULTS,
    folderConfig: FOLDER_DEFAULTS,
    sortConfig: SORT_DEFAULTS,
    contextMenuConfig: CONTEXT_MENU_DEFAULTS,
    categorizationConfig: CATEGORY_DEFAULTS,
    previewConfig: PREVIEW_DEFAULTS,
    filterConfig: FILTER_DEFAULTS,
};

export const GLOBAL_FILE_DEFAULTS: FileTypeDetails = {
    category: "UNKNOWN",
    subCategory: "UNKNOWN",
    icon: File,
    color: "text-gray-500",
};

export const CATEGORY_FILE_DEFAULTS: Partial<Record<FileCategory, Partial<FileTypeDetails>>> = {
    CODE: {
        color: "text-blue-500",
        icon: MatrxIcon.Code.File.Icon,
    },
    DOCUMENT: {
        color: "text-yellow-500",
        icon: MatrxIcon.Text.File.Icon,
    },
    AUDIO: {
        color: "text-purple-500",
        icon: MatrxIcon.Audio.File.Icon,
    },
    IMAGE: {
        color: "text-pink-500",
        icon: MatrxIcon.Image.File.Icon,
    },
    VIDEO: {
        color: "text-red-500",
        icon: MatrxIcon.Video.File.Icon,
    },
    ARCHIVE: {
        color: "text-orange-500",
        icon: IconFileZip,
    },
    DATA: {
        color: "text-green-500",
        icon: IconFileDatabase,
    },
    UNKNOWN: {
        color: "text-gray-500",
        icon: IconFileUnknown,
    },
};
// SubCategory-level defaults
// @ts-ignore
export const SUBCATEGORY_FILE_DEFAULTS: Record<string, Partial<FileTypeDetails>> = {
    // Code Subcategories
    JAVASCRIPT: {
        icon: SiJavascript,
        color: "text-amber-500",
    },
    TYPESCRIPT: {
        icon: SiTypescript,
        color: "text-sky-500",
    },
    PYTHON: {
        icon: TwoColorPythonIcon,
        color: "text-green-600",
    },
    WEB: {
        icon: IconWorldWww,
        color: "text-blue-400",
    },
    CONFIG: {
        icon: IconSettingsCheck,
        color: "text-gray-400",
    },
    MARKDOWN: {
        icon: IconMarkdown,
        color: "text-gray-600",
    },

    // Document Subcategories
    MICROSOFT: {
        icon: IconBrandWindows,
        color: "text-blue-700",
    },
    GOOGLE: {
        icon: IconBrandGoogle,
        color: "text-green-600",
    },
    TEXT: {
        icon: IconFileTypeTxt,
        color: "text-yellow-500",
    },
    NOTES: {
        icon: IconTextCaption,
        color: "text-purple-500",
    },

    // Audio Subcategories
    BASIC_AUDIO: {
        icon: IconVolume2,
        color: "text-purple-500",
    },
    VOICE: {
        icon: IconRecordMail,
        color: "text-indigo-500",
    },
    MIDI: {
        color: "text-orange-500",
    },
    PLAYLIST: {
        icon: IconPlaylist,
        color: "text-blue-600",
    },

    // Image Subcategories
    BASIC_IMAGE: {
        icon: IconPhotoScan,
        color: "text-pink-500",
    },
    VECTOR: {
        icon: IconVector,
        color: "text-teal-500",
    },
    RAW: {
        icon: IconImageInPicture,
        color: "text-red-500",
    },
    DESIGN: {
        icon: IconBrandAbstract,
        color: "text-yellow-500",
    },

    // Video Subcategories
    BASIC_VIDEO: {
        icon: IconVideo,
        color: "text-red-500",
    },
    STREAMING: {
        icon: IconMovie,
        color: "text-purple-600",
    },
    RECORDING: {
        icon: IconVideoPlus,
        color: "text-blue-700",
    },

    // Archive Subcategories
    COMPRESSED: {
        icon: IconFileZip,
        color: "text-orange-500",
    },
    DISK_IMAGE: {
        icon: IconDeviceFloppy,
        color: "text-gray-500",
    },

    // Data Subcategories
    STRUCTURED: {
        icon: IconBlocks,
        color: "text-green-500",
    },
    CONFIG_DATA: {
        icon: IconSettingsSearch,
        color: "text-teal-400",
    },
};

export const FILE_EXTENSIONS_LOOKUP: Record<string, FileTypeDetails> = {
    // Code Files
    js: { category: "CODE", subCategory: "JAVASCRIPT", icon: SiJavascript, color: "text-amber-500", canPreview: true },
    jsx: { category: "CODE", subCategory: "JAVASCRIPT", icon: SiJavascript, color: "text-amber-500", canPreview: true },
    mjs: { category: "CODE", subCategory: "JAVASCRIPT", icon: SiJavascript, color: "text-amber-500", canPreview: true },
    ts: { category: "CODE", subCategory: "TYPESCRIPT", icon: SiTypescript, color: "text-sky-500", canPreview: true },
    tsx: { category: "CODE", subCategory: "TYPESCRIPT", icon: SiTypescript, color: "text-sky-500", canPreview: true },
    dts: { category: "CODE", subCategory: "TYPESCRIPT", icon: SiTypescript, color: "text-sky-500", canPreview: true },
    py: { category: "CODE", subCategory: "PYTHON", icon: TwoColorPythonIcon, color: "", canPreview: true },
    pyw: { category: "CODE", subCategory: "PYTHON", icon: TwoColorPythonIcon, color: "", canPreview: true },
    pyx: { category: "CODE", subCategory: "PYTHON", icon: TwoColorPythonIcon, color: "", canPreview: true },
    pxd: { category: "CODE", subCategory: "PYTHON", icon: TwoColorPythonIcon, color: "", canPreview: true },
    pxi: { category: "CODE", subCategory: "PYTHON", icon: IconBrandPython, color: "text-green-500", canPreview: true },
    html: { category: "CODE", subCategory: "WEB", icon: IconFileTypeHtml, color: "text-orange-500", canPreview: true },
    htm: { category: "CODE", subCategory: "WEB", icon: IconFileTypeHtml, color: "text-orange-500", canPreview: true },
    css: { category: "CODE", subCategory: "WEB", icon: IconFileTypeCss, color: "text-blue-500", canPreview: true },
    scss: { category: "CODE", subCategory: "WEB", icon: IconFileTypeCss, color: "text-pink-500", canPreview: true },
    sass: { category: "CODE", subCategory: "WEB", icon: IconFileTypeCss, color: "text-pink-500", canPreview: true },
    less: { category: "CODE", subCategory: "WEB", icon: IconFileTypeCss, color: "text-blue-400", canPreview: true },
    json: { category: "CODE", subCategory: "CONFIG", icon: FileJson, color: "text-yellow-500", canPreview: true },
    yaml: { category: "CODE", subCategory: "CONFIG", icon: FileCode, color: "text-gray-500", canPreview: true },
    yml: { category: "CODE", subCategory: "CONFIG", icon: FileCode, color: "text-gray-500", canPreview: true },
    toml: { category: "CODE", subCategory: "CONFIG", icon: FileCode, color: "text-gray-500", canPreview: true },
    ini: { category: "CODE", subCategory: "CONFIG", icon: FileCode, color: "text-gray-500", canPreview: true },
    env: { category: "CODE", subCategory: "CONFIG", icon: FileCode, color: "text-gray-500", canPreview: true },
    md: { category: "CODE", subCategory: "MARKDOWN", icon: FileCode, color: "text-blue-gray-500", canPreview: true },
    mdx: { category: "CODE", subCategory: "MARKDOWN", icon: FileCode, color: "text-blue-gray-500", canPreview: true },
    markdown: { category: "CODE", subCategory: "MARKDOWN", icon: FileCode, color: "text-blue-gray-500", canPreview: true },

    // Documents
    doc: { category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypeDoc, color: "text-blue-600", canPreview: true },
    docx: { category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypeDocx, color: "text-blue-600", canPreview: true },
    xls: { category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypeXls, color: "text-green-600", canPreview: true },
    xlsx: { category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypeXls, color: "text-green-600", canPreview: true },
    ppt: { category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypePpt, color: "text-red-600", canPreview: true },
    pptx: { category: "DOCUMENT", subCategory: "MICROSOFT", icon: IconFileTypePpt, color: "text-red-600", canPreview: true },
    gdoc: { category: "DOCUMENT", subCategory: "GOOGLE", icon: File, color: "text-blue-500", canPreview: true },
    gsheet: { category: "DOCUMENT", subCategory: "GOOGLE", icon: Table2, color: "text-green-500", canPreview: true },
    gslide: { category: "DOCUMENT", subCategory: "GOOGLE", icon: File, color: "text-yellow-500", canPreview: true },
    txt: { category: "DOCUMENT", subCategory: "TEXT", icon: GrDocumentTxt, color: "text-blue-500", canPreview: true },
    rtf: { category: "DOCUMENT", subCategory: "TEXT", icon: File, color: "text-gray-500", canPreview: true },
    pdf: { category: "DOCUMENT", subCategory: "PDF", icon: FaFilePdf, color: "text-red-500", canPreview: true },
    note: { category: "DOCUMENT", subCategory: "NOTES", icon: File, color: "text-yellow-500", canPreview: true },

    // Audio
    mp3: { category: "AUDIO", subCategory: "BASIC", icon: FileAudio, color: "text-purple-500", canPreview: true },
    wav: { category: "AUDIO", subCategory: "BASIC", icon: FileAudio, color: "text-purple-500", canPreview: true },
    ogg: { category: "AUDIO", subCategory: "BASIC", icon: FileAudio, color: "text-purple-500", canPreview: true },
    m4a: { category: "AUDIO", subCategory: "BASIC", icon: FileAudio, color: "text-purple-500", canPreview: true },
    webm: { category: "AUDIO", subCategory: "VOICE", icon: FileAudio, color: "text-purple-500", canPreview: true },
    aac: { category: "AUDIO", subCategory: "VOICE", icon: FileAudio, color: "text-purple-500", canPreview: true },
    mp4a: { category: "AUDIO", subCategory: "VOICE", icon: FileAudio, color: "text-purple-500", canPreview: true },

    mid: { category: "AUDIO", subCategory: "MIDI", icon: FileAudio, color: "text-orange-500", canPreview: true },
    midi: { category: "AUDIO", subCategory: "MIDI", icon: FileAudio, color: "text-orange-500", canPreview: true },
    m3u: { category: "AUDIO", subCategory: "PLAYLIST", icon: FileAudio, color: "text-blue-500", canPreview: true },
    m3u8: { category: "AUDIO", subCategory: "PLAYLIST", icon: FileAudio, color: "text-blue-500", canPreview: true },
    pls: { category: "AUDIO", subCategory: "PLAYLIST", icon: FileAudio, color: "text-blue-500", canPreview: true },

    // Images
    jpg: { category: "IMAGE", subCategory: "BASIC", icon: IconFileTypeJpg, color: "text-pink-500", canPreview: true },
    jpeg: { category: "IMAGE", subCategory: "BASIC", icon: IconFileTypeJpg, color: "text-pink-500", canPreview: true },
    png: { category: "IMAGE", subCategory: "BASIC", icon: IconFileTypePng, color: "text-green-500", canPreview: true },
    gif: { category: "IMAGE", subCategory: "BASIC", icon: IconGif, color: "text-blue-500", canPreview: true },
    webp: { category: "IMAGE", subCategory: "BASIC", icon: FileImage, color: "text-indigo-500", canPreview: true },
    svg: { category: "IMAGE", subCategory: "VECTOR", icon: FileImage, color: "text-orange-500", canPreview: true },

    // Video
    mp4: { category: "VIDEO", subCategory: "BASIC", icon: FileVideo, color: "text-blue-500", canPreview: true },
    mov: { category: "VIDEO", subCategory: "BASIC", icon: FileVideo, color: "text-blue-500", canPreview: true },

    // Archives
    zip: { category: "ARCHIVE", subCategory: "COMPRESSED", icon: IconFileTypeZip, color: "text-yellow-600", canPreview: true },
    rar: { category: "ARCHIVE", subCategory: "COMPRESSED", icon: FileArchive, color: "text-red-600", canPreview: true },
    "7z": { category: "ARCHIVE", subCategory: "COMPRESSED", icon: FileArchive, color: "text-gray-600", canPreview: true },

    // Data Files
    csv: { category: "DATA", subCategory: "STRUCTURED", icon: GrDocumentCsv, color: "text-green-600", canPreview: true },
    xml: { category: "DATA", subCategory: "STRUCTURED", icon: IconFileTypeXml, color: "text-orange-600", canPreview: true },
    sqlite: { category: "DATA", subCategory: "STRUCTURED", icon: File, color: "text-blue-600", canPreview: true },
    db: { category: "DATA", subCategory: "STRUCTURED", icon: File, color: "text-blue-600", canPreview: true },
    tar: { category: "ARCHIVE", subCategory: "COMPRESSED", icon: FileArchive, color: "text-yellow-600", canPreview: true },
    gz: { category: "ARCHIVE", subCategory: "COMPRESSED", icon: FileArchive, color: "text-yellow-600", canPreview: true },

    // Design Files
    ai: { category: "IMAGE", subCategory: "VECTOR", icon: FileImage, color: "text-orange-600", canPreview: true },
    eps: { category: "IMAGE", subCategory: "VECTOR", icon: FileImage, color: "text-orange-600", canPreview: true },

    // RAW Image Files
    raw: { category: "IMAGE", subCategory: "RAW", icon: FileImage, color: "text-gray-600", canPreview: true },
    cr2: { category: "IMAGE", subCategory: "RAW", icon: FileImage, color: "text-gray-600", canPreview: true },
    nef: { category: "IMAGE", subCategory: "RAW", icon: FileImage, color: "text-gray-600", canPreview: true },
    arw: { category: "IMAGE", subCategory: "RAW", icon: FileImage, color: "text-gray-600", canPreview: true },

    // Design Software Files
    psd: { category: "IMAGE", subCategory: "DESIGN", icon: FileImage, color: "text-blue-600", canPreview: true },
    xcf: { category: "IMAGE", subCategory: "DESIGN", icon: FileImage, color: "text-purple-600", canPreview: true },
    sketch: { category: "IMAGE", subCategory: "DESIGN", icon: FileImage, color: "text-blue-500", canPreview: true },

    // Disk Image Files
    iso: { category: "ARCHIVE", subCategory: "DISK_IMAGE", icon: File, color: "text-gray-600", canPreview: true },
    img: { category: "ARCHIVE", subCategory: "DISK_IMAGE", icon: File, color: "text-gray-600", canPreview: true },
    dmg: { category: "ARCHIVE", subCategory: "DISK_IMAGE", icon: File, color: "text-gray-600", canPreview: true },

    // Configuration Files
    cfg: { category: "DATA", subCategory: "CONFIG", icon: File, color: "text-gray-500", canPreview: true },
    conf: { category: "DATA", subCategory: "CONFIG", icon: File, color: "text-gray-500", canPreview: true },
};

export const FILE_EXTENSION_DEFAULTS: FileTypeDetails = {
    category: "UNKNOWN",
    subCategory: "UNKNOWN",
    icon: File,
    color: "text-gray-500",
    canPreview: false,
};

export const getFileDetails = (extension: string): FileTypeDetails => {
    const extConfig = FILE_EXTENSIONS_LOOKUP[extension] || { category: "UNKNOWN", subCategory: "UNKNOWN" };
    const result = { ...GLOBAL_FILE_DEFAULTS };
    if (extConfig.category) {
        const categoryDefaults = CATEGORY_FILE_DEFAULTS[extConfig.category] || {};
        Object.assign(result, categoryDefaults);
    }
    if (extConfig.subCategory) {
        const subCategoryDefaults = SUBCATEGORY_FILE_DEFAULTS[extConfig.subCategory] || {};
        Object.assign(result, subCategoryDefaults);
    }
    Object.assign(result, extConfig);
    return result;
};

export const FOLDER_TYPE_DEFAULTS: FolderTypeDetails = {
    category: "FOLDER",
    subCategory: "FOLDER",
    icon: Folder,
    color: "text-gray-500",
    protected: false,
    description: "",
};

const SOME_DEFAULT_LIST: { pattern: RegExp; details: Partial<FolderTypeDetails> }[] = [
    {
        pattern: /node_modules/i,
        details: {
            category: "FOLDER",
            subCategory: "FOLDER",
            icon: Package,
            color: "text-green-500",
        },
    },
    {
        pattern: /(personal|private|confidential)/i,
        details: {
            category: "FOLDER",
            subCategory: "FOLDER",
            icon: Lock,
            color: "text-red-500",
            protected: true,
        },
    },
    {
        pattern: /public/i,
        details: {
            category: "FOLDER",
            subCategory: "FOLDER",
            icon: Globe,
            color: "text-blue-500",
        },
    },
];

export const getFolderDetails = (name: string): FolderTypeDetails => {
    for (const rule of SOME_DEFAULT_LIST) {
        if (rule.pattern.test(name)) {
            return {
                ...FOLDER_TYPE_DEFAULTS,
                ...rule.details,
            };
        }
    }
    return FOLDER_TYPE_DEFAULTS;
};

export const getFileDetailsByExtension = (fileName: string): FileTypeDetails => {
    const ext = fileName.toLowerCase().split(".").pop() || "";
    const extConfig = FILE_EXTENSIONS_LOOKUP[ext] || { category: "UNKNOWN", subCategory: "UNKNOWN" };

    const result = { ...GLOBAL_FILE_DEFAULTS };

    if (extConfig.category) {
        const categoryDefaults = CATEGORY_FILE_DEFAULTS[extConfig.category] || {};
        Object.assign(result, categoryDefaults);
    }

    if (extConfig.subCategory) {
        const subCategoryDefaults = SUBCATEGORY_FILE_DEFAULTS[extConfig.subCategory] || {};
        Object.assign(result, subCategoryDefaults);
    }

    Object.assign(result, extConfig);

    return result;
};

// utils/file-filters.ts

const SYSTEM_FILES = new Set([".emptyFolderPlaceholder", ".folder"]);

export const isSystemFile = (path: string): boolean => {
    const name = path.split("/").pop() || "";
    return SYSTEM_FILES.has(name);
};

import { FaFolderTree } from "react-icons/fa6";
import { MatrxIcon } from "@/components/DirectoryTree/matrxSystemIcons";

export const BUCKET_DEFAULTS = {
    "code-editor": {
        color: "text-blue-500",
        icon: MatrxIcon.Code.Folder.Icon,
    },
    Code: {
        color: "text-blue-500",
        icon: MatrxIcon.Code.Folder.Icon,
    },
    Images: {
        color: "text-green-500",
        icon: MatrxIcon.Image.Folder.Icon,
    },
    Audio: {
        color: "text-yellow-500",
        icon: MatrxIcon.Audio.Folder.Icon,
    },
    Videos: {
        color: "text-purple-500",
        icon: MatrxIcon.Video.Folder.Icon,
    },
    Documents: {
        color: "text-pink-500",
        icon: MatrxIcon.Text.Folder.Icon,
    },
    "any-file": {
        color: "text-red-500",
        icon: FaFolderTree,
    },
    "Any File": {
        color: "text-red-500",
        icon: FaFolderTree,
    },
    Spreadsheets: {
        color: "text-red-500",
        icon: MatrxIcon.Spreadsheet.Folder.Icon,
    },
    Notes: {
        color: "",
        icon: MatrxIcon.Notes.Folder.Letter,
    },
};

export const getBucketDetails = (bucketName: string) => {
    return (
        BUCKET_DEFAULTS[bucketName] || {
            color: "text-gray-500",
            icon: FaFolderTree,
        }
    );
};

// Updated type definition
export type EnhancedFileDetails = Omit<FileTypeDetails, "icon"> & {
    icon?: IconComponent; // Make icon optional
    filename: string;
    extension: string;
    iconName: string;
    bucket?: string;
    path?: string;
    quickPreview?: boolean;
    mimetype?: string;
    size?: number;
    localId?: string;
};

export const getFileDetailsByUrl = (url: string, metadata?: StorageMetadata, localId?: string): EnhancedFileDetails => {
    let cleanFileName = "";
    let bucket = "";
    let path = "";

    try {
        const decodedUrl = decodeURIComponent(url);
        const urlParts = decodedUrl.split("/");
        const lastPart = urlParts[urlParts.length - 1];
        cleanFileName = lastPart.split("?")[0];

        if (!cleanFileName) {
            cleanFileName = url.split("/").pop() || "";
        }

        // Check for Supabase signed URL pattern
        const renderImageSignPattern = /render\/image\/sign/;
        // Also keep the existing signed URL pattern check
        const signedUrlPattern = /storage\/v1\/object\/sign/;

        if (renderImageSignPattern.test(url)) {
            // For URLs containing render/image/sign
            const signIndex = urlParts.indexOf("sign");
            if (signIndex !== -1 && signIndex + 1 < urlParts.length) {
                bucket = urlParts[signIndex - 3]; // Gets the bucket (e.g., txzxabzwovsujtloxrus)
                const pathParts = urlParts.slice(signIndex + 1, urlParts.length);
                path = pathParts.join("/").split("?")[0]; // Remove query params
            }
        } else if (signedUrlPattern.test(url)) {
            // Existing logic for signed URLs
            const storageIndex = urlParts.indexOf("storage");
            if (storageIndex !== -1 && storageIndex + 4 < urlParts.length) {
                bucket = urlParts[storageIndex + 4];
                const pathParts = urlParts.slice(storageIndex + 5, -1);
                path = pathParts.join("/");
            }
        } else {
            // Existing fallback logic
            const storageIndex = urlParts.indexOf("storage");
            if (storageIndex !== -1 && storageIndex + 2 < urlParts.length) {
                bucket = urlParts[storageIndex + 2];
                const pathParts = urlParts.slice(storageIndex + 3, -1);
                path = pathParts.join("/");
            } else {
                const hostnameParts = new URL(url).hostname.split(".");
                bucket = hostnameParts[0] || "";
                const pathParts = urlParts.slice(3, -1);
                path = pathParts.join("/");
            }
        }
    } catch (error) {
        cleanFileName = url.split("/").pop() || "";
        cleanFileName = cleanFileName.split("?")[0];
    }

    const ext = cleanFileName.toLowerCase().split(".").pop() || "";
    const extConfig = FILE_EXTENSIONS_LOOKUP[ext] || { category: "UNKNOWN", subCategory: "UNKNOWN" };

    const result = { ...GLOBAL_FILE_DEFAULTS };

    if (extConfig.category) {
        const categoryDefaults = CATEGORY_FILE_DEFAULTS[extConfig.category] || {};
        Object.assign(result, categoryDefaults);
    }

    if (extConfig.subCategory) {
        const subCategoryDefaults = SUBCATEGORY_FILE_DEFAULTS[extConfig.subCategory] || {};
        Object.assign(result, subCategoryDefaults);
    }

    Object.assign(result, extConfig);

    // Extract iconName from the icon component
    const iconName = (result.icon as any)?.displayName || "UnknownIcon";

    return {
        ...result,
        filename: cleanFileName,
        extension: ext,
        iconName, // Add the extracted icon name
        bucket: bucket || undefined,
        path: path || undefined,
        quickPreview: metadata?.mimetype?.startsWith("image") || false,
        mimetype: metadata?.mimetype || undefined,
        size: metadata?.size || undefined,
        localId: localId || undefined,
    };
};
