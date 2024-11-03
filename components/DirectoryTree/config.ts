// components/DirectoryTree/config.ts
import {
    FileJson, FileText, FileCode, FileImage,
    FileInput, FileVideo, FileSpreadsheet, File
} from 'lucide-react';

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

export interface DirectoryTreeConfig {
    excludeFiles?: string[];      // Files to exclude (exact matches or patterns)
    excludeDirs?: string[];       // Directories to exclude
    hideHiddenFiles?: boolean;    // Whether to hide files starting with .
    showIcons?: boolean;          // Whether to show file type icons
    indentSize?: number;         // Size of each indent level in pixels
    sortFoldersFirst?: boolean;  // Whether to sort folders before files
}

export const DEFAULT_CONFIG: DirectoryTreeConfig = {
    excludeFiles: [],
    excludeDirs: [],
    hideHiddenFiles: false,
    showIcons: true,
    indentSize: 24,
    sortFoldersFirst: true
};
