/**
 * features/files/utils/icon-map.ts
 *
 * Curated icon + category map for cloud-files. Duplicated (not imported) from
 * the legacy [utils/file-operations/constants.ts](../../../../utils/file-operations/constants.ts)
 * so the legacy file can be deleted in Phase 11 without breaking us.
 *
 * Only Lucide icons — keep the dep footprint minimal. Categories drive
 * preview selection; colors drive the visual rhythm of tree/list rows.
 */

import {
  Archive,
  Braces,
  Code,
  Database,
  File as FileIcon,
  FileAudio,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Music,
  Package,
  Video,
  type LucideIcon,
} from "lucide-react";

import { extname } from "./path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileCategory =
  | "CODE"
  | "DOCUMENT"
  | "AUDIO"
  | "IMAGE"
  | "VIDEO"
  | "ARCHIVE"
  | "DATA"
  | "UNKNOWN"
  | "FOLDER";

export type PreviewKind =
  | "code"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "text"
  | "markdown"
  | "data"
  | "spreadsheet"
  | "generic";

export interface FileTypeDetails {
  icon: LucideIcon;
  color: string;
  category: FileCategory;
  subCategory: string;
  previewKind: PreviewKind;
  canPreview: boolean;
}

// ---------------------------------------------------------------------------
// Per-category defaults
// ---------------------------------------------------------------------------

const CATEGORY_DEFAULTS: Record<FileCategory, FileTypeDetails> = {
  CODE: {
    icon: FileCode,
    color: "text-yellow-500",
    category: "CODE",
    subCategory: "SOURCE",
    previewKind: "code",
    canPreview: true,
  },
  DOCUMENT: {
    icon: FileText,
    color: "text-blue-500",
    category: "DOCUMENT",
    subCategory: "DOCUMENT",
    previewKind: "text",
    canPreview: true,
  },
  AUDIO: {
    icon: FileAudio,
    color: "text-pink-500",
    category: "AUDIO",
    subCategory: "AUDIO",
    previewKind: "audio",
    canPreview: true,
  },
  IMAGE: {
    icon: FileImage,
    color: "text-emerald-500",
    category: "IMAGE",
    subCategory: "IMAGE",
    previewKind: "image",
    canPreview: true,
  },
  VIDEO: {
    icon: FileVideo,
    color: "text-purple-500",
    category: "VIDEO",
    subCategory: "VIDEO",
    previewKind: "video",
    canPreview: true,
  },
  ARCHIVE: {
    icon: Archive,
    color: "text-amber-600",
    category: "ARCHIVE",
    subCategory: "ARCHIVE",
    previewKind: "generic",
    canPreview: false,
  },
  DATA: {
    icon: Database,
    color: "text-orange-500",
    category: "DATA",
    subCategory: "DATA",
    previewKind: "data",
    canPreview: true,
  },
  FOLDER: {
    icon: Folder,
    color: "text-sky-500",
    category: "FOLDER",
    subCategory: "FOLDER",
    previewKind: "generic",
    canPreview: false,
  },
  UNKNOWN: {
    icon: FileIcon,
    color: "text-muted-foreground",
    category: "UNKNOWN",
    subCategory: "UNKNOWN",
    previewKind: "generic",
    canPreview: false,
  },
};

// ---------------------------------------------------------------------------
// Per-extension overrides — only where we want distinct icons/colors
// ---------------------------------------------------------------------------

const EXTENSION_OVERRIDES: Record<string, Partial<FileTypeDetails> & { category: FileCategory }> = {
  // Code — JS / TS
  js: { category: "CODE", icon: FileCode, color: "text-yellow-500", subCategory: "JAVASCRIPT" },
  jsx: { category: "CODE", icon: FileCode, color: "text-yellow-500", subCategory: "JAVASCRIPT" },
  mjs: { category: "CODE", icon: FileCode, color: "text-yellow-500", subCategory: "JAVASCRIPT" },
  cjs: { category: "CODE", icon: FileCode, color: "text-yellow-500", subCategory: "JAVASCRIPT" },
  ts: { category: "CODE", icon: FileCode, color: "text-blue-500", subCategory: "TYPESCRIPT" },
  tsx: { category: "CODE", icon: FileCode, color: "text-blue-500", subCategory: "TYPESCRIPT" },
  // Code — other languages
  py: { category: "CODE", icon: Code, color: "text-emerald-500", subCategory: "PYTHON" },
  rb: { category: "CODE", icon: Code, color: "text-red-500", subCategory: "RUBY" },
  go: { category: "CODE", icon: Code, color: "text-cyan-500", subCategory: "GO" },
  rs: { category: "CODE", icon: Code, color: "text-orange-600", subCategory: "RUST" },
  java: { category: "CODE", icon: Code, color: "text-red-600", subCategory: "JAVA" },
  swift: { category: "CODE", icon: Code, color: "text-orange-500", subCategory: "SWIFT" },
  c: { category: "CODE", icon: Code, color: "text-blue-600", subCategory: "C" },
  h: { category: "CODE", icon: Code, color: "text-blue-600", subCategory: "C" },
  cpp: { category: "CODE", icon: Code, color: "text-blue-700", subCategory: "CPP" },
  cs: { category: "CODE", icon: Code, color: "text-purple-600", subCategory: "CSHARP" },
  // Code — web
  html: { category: "CODE", icon: Code, color: "text-orange-400", subCategory: "HTML" },
  htm: { category: "CODE", icon: Code, color: "text-orange-400", subCategory: "HTML" },
  css: { category: "CODE", icon: Code, color: "text-sky-400", subCategory: "CSS" },
  scss: { category: "CODE", icon: Code, color: "text-pink-400", subCategory: "SCSS" },
  // Code — config
  json: { category: "CODE", icon: FileJson, color: "text-amber-500", subCategory: "JSON", previewKind: "data" },
  yaml: { category: "CODE", icon: Braces, color: "text-amber-500", subCategory: "YAML" },
  yml: { category: "CODE", icon: Braces, color: "text-amber-500", subCategory: "YAML" },
  toml: { category: "CODE", icon: Braces, color: "text-amber-500", subCategory: "TOML" },
  // Documents
  md: { category: "DOCUMENT", icon: FileText, color: "text-slate-400", subCategory: "MARKDOWN", previewKind: "markdown" },
  mdx: { category: "DOCUMENT", icon: FileText, color: "text-slate-400", subCategory: "MARKDOWN", previewKind: "markdown" },
  txt: { category: "DOCUMENT", icon: FileText, color: "text-muted-foreground", subCategory: "PLAIN" },
  log: { category: "DOCUMENT", icon: FileText, color: "text-muted-foreground", subCategory: "LOG" },
  pdf: { category: "DOCUMENT", icon: FileType, color: "text-red-500", subCategory: "PDF", previewKind: "pdf" },
  doc: { category: "DOCUMENT", icon: FileText, color: "text-blue-500", subCategory: "WORD" },
  docx: { category: "DOCUMENT", icon: FileText, color: "text-blue-500", subCategory: "WORD" },
  xls: { category: "DOCUMENT", icon: FileSpreadsheet, color: "text-emerald-600", subCategory: "EXCEL", previewKind: "spreadsheet" },
  xlsx: { category: "DOCUMENT", icon: FileSpreadsheet, color: "text-emerald-600", subCategory: "EXCEL", previewKind: "spreadsheet" },
  ppt: { category: "DOCUMENT", icon: FileType, color: "text-orange-600", subCategory: "POWERPOINT" },
  pptx: { category: "DOCUMENT", icon: FileType, color: "text-orange-600", subCategory: "POWERPOINT" },
  // Data
  csv: { category: "DATA", icon: FileSpreadsheet, color: "text-orange-500", subCategory: "CSV", previewKind: "data" },
  tsv: { category: "DATA", icon: FileSpreadsheet, color: "text-orange-500", subCategory: "TSV", previewKind: "data" },
  xml: { category: "DATA", icon: Braces, color: "text-amber-500", subCategory: "XML", previewKind: "data" },
  sqlite: { category: "DATA", icon: Database, color: "text-blue-400", subCategory: "SQLITE" },
  db: { category: "DATA", icon: Database, color: "text-blue-400", subCategory: "DB" },
  // Images
  jpg: { category: "IMAGE", icon: ImageIcon, color: "text-emerald-500", subCategory: "JPEG" },
  jpeg: { category: "IMAGE", icon: ImageIcon, color: "text-emerald-500", subCategory: "JPEG" },
  png: { category: "IMAGE", icon: ImageIcon, color: "text-emerald-500", subCategory: "PNG" },
  gif: { category: "IMAGE", icon: ImageIcon, color: "text-emerald-500", subCategory: "GIF" },
  webp: { category: "IMAGE", icon: ImageIcon, color: "text-emerald-500", subCategory: "WEBP" },
  svg: { category: "IMAGE", icon: ImageIcon, color: "text-emerald-500", subCategory: "SVG" },
  heic: { category: "IMAGE", icon: ImageIcon, color: "text-emerald-500", subCategory: "HEIC" },
  // Video
  mp4: { category: "VIDEO", icon: Video, color: "text-purple-500", subCategory: "MP4" },
  mov: { category: "VIDEO", icon: Video, color: "text-purple-500", subCategory: "MOV" },
  webm: { category: "VIDEO", icon: Video, color: "text-purple-500", subCategory: "WEBM" },
  mkv: { category: "VIDEO", icon: Video, color: "text-purple-500", subCategory: "MKV" },
  avi: { category: "VIDEO", icon: Video, color: "text-purple-500", subCategory: "AVI" },
  // Audio
  mp3: { category: "AUDIO", icon: Music, color: "text-pink-500", subCategory: "MP3" },
  wav: { category: "AUDIO", icon: Music, color: "text-pink-500", subCategory: "WAV" },
  ogg: { category: "AUDIO", icon: Music, color: "text-pink-500", subCategory: "OGG" },
  m4a: { category: "AUDIO", icon: Music, color: "text-pink-500", subCategory: "M4A" },
  aac: { category: "AUDIO", icon: Music, color: "text-pink-500", subCategory: "AAC" },
  flac: { category: "AUDIO", icon: Music, color: "text-pink-500", subCategory: "FLAC" },
  // Archives
  zip: { category: "ARCHIVE", icon: Archive, color: "text-amber-600", subCategory: "ZIP" },
  rar: { category: "ARCHIVE", icon: Archive, color: "text-amber-600", subCategory: "RAR" },
  "7z": { category: "ARCHIVE", icon: Archive, color: "text-amber-600", subCategory: "7Z" },
  tar: { category: "ARCHIVE", icon: Package, color: "text-amber-600", subCategory: "TAR" },
  gz: { category: "ARCHIVE", icon: Package, color: "text-amber-600", subCategory: "GZ" },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getFileTypeDetails(filename: string): FileTypeDetails {
  const ext = extname(filename);
  const override = EXTENSION_OVERRIDES[ext];
  if (!override) return CATEGORY_DEFAULTS.UNKNOWN;
  const category = override.category;
  return { ...CATEGORY_DEFAULTS[category], ...override };
}

export function getFolderTypeDetails(
  open: boolean = false,
): FileTypeDetails {
  return {
    ...CATEGORY_DEFAULTS.FOLDER,
    icon: open ? FolderOpen : Folder,
  };
}
