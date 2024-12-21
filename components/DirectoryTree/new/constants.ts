import {
    IconBrandPython, IconFileTypeCss, IconFileTypeCsv, IconFileTypeDoc, IconFileTypeDocx,
    IconFileTypeHtml, IconFileTypeJpg,
    IconFileTypeJs,
    IconFileTypeJsx, IconFileTypePdf, IconFileTypePng, IconFileTypePpt,
    IconFileTypeTs,
    IconFileTypeTsx, IconFileTypeTxt, IconFileTypeXls, IconFileTypeXml, IconFileTypeZip, IconGif
} from "@tabler/icons-react";
import {TwoColorPythonIcon} from "@/components/DirectoryTree/custom-icons";
import {File, FileArchive, FileAudio, FileCode, FileImage, FileJson, FileVideo, Table2} from "lucide-react";
import {
    EnhancedDirectoryTreeConfig,
    FileTypeDetails
} from "@/components/DirectoryTree/config";

export const DEFAULT_TREE_CONFIG: EnhancedDirectoryTreeConfig = {
    excludeFiles: [],

    excludeDirs: [],

    hideHiddenFiles: false,

    showIcons: true,

    indentSize: 24,

    sortFoldersFirst: true,

    enablePreview: true,


    categorization: {
        enabled: true,
        groupByCategory: false,
        showCategoryHeaders: false,
        categories: ['CODE', 'DOCUMENT', 'IMAGE', 'AUDIO', 'VIDEO', 'DATA', 'ARCHIVE', "UNKNOWN"],
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

const FILE_EXTENSION_DEFAULTS: FileTypeDetails = {
    category: "UNKNOWN",
    subCategory: "UNKNOWN",
    icon: File,
    color: 'text-gray-500'
}



export const getFileDetails = (fileName: string): FileTypeDetails => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const lookup = FILE_EXTENSIONS_LOOKUP[ext];
    if (lookup) {
        if (lookup.icon === undefined) {
            lookup.icon = FILE_EXTENSION_DEFAULTS.icon;
        }
        if (lookup.color === undefined) {
            lookup.color = FILE_EXTENSION_DEFAULTS.color;
        }
        if (lookup.category === undefined) {
            lookup.category = FILE_EXTENSION_DEFAULTS.category;
        }
        if (lookup.subCategory === undefined) {
            lookup.subCategory = FILE_EXTENSION_DEFAULTS.subCategory;
        }
        return lookup;
    }
    return {category: "UNKNOWN", subCategory: "UNKNOWN", icon: File, color: 'text-gray-500'};
};
