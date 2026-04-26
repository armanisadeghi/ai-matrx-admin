/**
 * features/files/utils/file-types.ts
 *
 * THE SINGLE SOURCE OF TRUTH for cloud-files type capabilities.
 *
 * If you need to:
 *   - Add support for a new file type
 *   - Change which previewer a type uses
 *   - Change which icon / color a type renders with
 *   - Change whether a type renders a real thumbnail or a fallback icon
 *   - Add or remove a thumbnail strategy
 *   - Change a size cap for a particular kind
 *
 * → edit THIS file. Nothing else in the cloud-files feature should
 * encode this knowledge.
 *
 * The supporting modules (`mime.ts`, `icon-map.ts`,
 * `preview-capabilities.ts`) are thin wrappers that read from this
 * registry and exist only for backwards-compat with older imports.
 *
 * ─────────────────────────────────────────────────────────────────────
 * Structure
 * ─────────────────────────────────────────────────────────────────────
 *
 *   FILE_TYPES is an array of declarative entries. Each entry says:
 *
 *     - which extensions match it
 *     - the canonical MIME type (used as a fallback when the server
 *       didn't send one and to canonicalize between the dozens of
 *       legacy aliases the web has accumulated)
 *     - which preview component to use
 *     - which thumbnail strategy to use in grid / list views
 *     - the icon + color tokens that drive the iconography
 *     - a human-friendly display name (e.g. "PDF Document" vs "pdf")
 *     - any size cap that overrides the global preview cap
 *
 * Mime-first override: when the browser knows a MIME (e.g. it set
 * `image/avif` even though we don't have `.avif` in the extension
 * table), the wrapper helpers fall back to MIME-prefix matching for
 * `image/*`, `video/*`, `audio/*`, and `application/pdf`, so adding a
 * brand-new image format never requires more than a one-line entry.
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
  Subtitles,
  Video,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Top-level grouping. Drives sidebar filters and color rhythm. */
export type FileCategory =
  | "CODE"
  | "DOCUMENT"
  | "AUDIO"
  | "IMAGE"
  | "VIDEO"
  | "ARCHIVE"
  | "DATA"
  | "NOTEBOOK"
  | "SUBTITLES"
  | "EMAIL"
  | "EBOOK"
  | "MODEL_3D"
  | "UNKNOWN"
  | "FOLDER";

/** Which previewer should render this kind. `generic` means "no preview". */
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

/**
 * Strategy for the small inline thumbnail rendered in grid / list views.
 *
 *   "image"           — fetch the file, render `<img>` (works for any
 *                       browser-renderable image format)
 *   "video-poster"    — render a `<video preload="metadata">` and let the
 *                       browser display the first frame as the thumbnail
 *   "pdf-firstpage"   — lazy-render the PDF's first page via pdfjs to a
 *                       small canvas. Heavier but yields useful previews.
 *   "backend-thumb"   — read a backend-generated thumbnail URL from
 *                       `metadata.thumbnail_url` (Python team to ship —
 *                       see PYTHON_TEAM_COMMS item "thumbnail generation")
 *   "icon"            — fallback to the file's category icon (Lucide).
 */
export type ThumbnailStrategy =
  | "image"
  | "video-poster"
  | "pdf-firstpage"
  | "backend-thumb"
  | "icon";

/**
 * One row in the registry. Most fields are static; the `extensions` and
 * `mime` fields are the lookup keys.
 */
export interface FileTypeEntry {
  /** Extensions (lowercased, no dot) that map to this entry. First wins. */
  extensions: readonly string[];
  /** Canonical MIME. Used to fill `mime_type` when the server didn't send one. */
  mime: string;
  category: FileCategory;
  /** Specific name within the category, e.g. "PYTHON", "MP3". UPPERCASE. */
  subCategory: string;
  /** Human-friendly name shown in tooltips / "What can I preview?" lists. */
  displayName: string;
  previewKind: PreviewKind;
  thumbnailStrategy: ThumbnailStrategy;
  /** Tailwind text color token, e.g. `text-emerald-500`. */
  color: string;
  icon: LucideIcon;
  /** Override the global 10MB preview cap if the previewer can stream. */
  previewSizeCapOverride?: number | null;
}

/** What a caller actually needs to render any given file. */
export interface FileTypeDetails {
  category: FileCategory;
  subCategory: string;
  displayName: string;
  previewKind: PreviewKind;
  thumbnailStrategy: ThumbnailStrategy;
  color: string;
  icon: LucideIcon;
  /** Convenience — true when previewKind !== "generic". */
  canPreview: boolean;
  /** Convenience — null = use the global cap. */
  previewSizeCapOverride: number | null;
  /** The canonical MIME for the resolved type. */
  mime: string;
}

// ---------------------------------------------------------------------------
// Constants — the actual table
// ---------------------------------------------------------------------------

/** Global default preview cap. Bigger files render a "too large" message. */
export const MAX_INLINE_PREVIEW_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * The registry. Order matters only when an extension belongs to multiple
 * entries — the first match wins. In practice every extension is unique.
 *
 * Adding a new file type:
 *   1. Append a new entry.
 *   2. If the previewKind is something new (not in `PreviewKind`), add it
 *      to that union AND register a previewer in
 *      `components/core/FilePreview/FilePreview.tsx`.
 *   3. If the thumbnail strategy is new, extend `ThumbnailStrategy` and
 *      handle it in `MediaThumbnail`.
 *
 * That's it. No edits to `mime.ts`, `icon-map.ts`, etc.
 */
export const FILE_TYPES: readonly FileTypeEntry[] = [
  // ────────────────────── IMAGE ──────────────────────
  {
    extensions: ["jpg", "jpeg"],
    mime: "image/jpeg",
    category: "IMAGE",
    subCategory: "JPEG",
    displayName: "JPEG image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  {
    extensions: ["png"],
    mime: "image/png",
    category: "IMAGE",
    subCategory: "PNG",
    displayName: "PNG image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  {
    extensions: ["gif"],
    mime: "image/gif",
    category: "IMAGE",
    subCategory: "GIF",
    displayName: "GIF image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  {
    extensions: ["webp"],
    mime: "image/webp",
    category: "IMAGE",
    subCategory: "WEBP",
    displayName: "WebP image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  // AVIF — modern image format, supported natively by all evergreen browsers.
  {
    extensions: ["avif"],
    mime: "image/avif",
    category: "IMAGE",
    subCategory: "AVIF",
    displayName: "AVIF image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  {
    extensions: ["svg"],
    mime: "image/svg+xml",
    category: "IMAGE",
    subCategory: "SVG",
    displayName: "SVG image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  // HEIC / HEIF — Apple still uses these heavily. Browsers can render only on
  // Safari natively; on Chrome/Firefox the `<img>` falls back to the icon
  // automatically (image error → broken-icon UX). A backend conversion
  // (Python P-9) is the right long-term fix.
  {
    extensions: ["heic"],
    mime: "image/heic",
    category: "IMAGE",
    subCategory: "HEIC",
    displayName: "HEIC image (iOS)",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  {
    extensions: ["heif"],
    mime: "image/heif",
    category: "IMAGE",
    subCategory: "HEIF",
    displayName: "HEIF image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  // BMP / TIFF — older raster formats. Browser support is uneven (TIFF only
  // on Safari) but `<img>` will fail gracefully to the icon on others.
  {
    extensions: ["bmp"],
    mime: "image/bmp",
    category: "IMAGE",
    subCategory: "BMP",
    displayName: "Bitmap image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  {
    extensions: ["tif", "tiff"],
    mime: "image/tiff",
    category: "IMAGE",
    subCategory: "TIFF",
    displayName: "TIFF image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },
  {
    extensions: ["ico"],
    mime: "image/x-icon",
    category: "IMAGE",
    subCategory: "ICO",
    displayName: "Icon image",
    previewKind: "image",
    thumbnailStrategy: "image",
    color: "text-emerald-500",
    icon: ImageIcon,
  },

  // ────────────────────── VIDEO ──────────────────────
  // Video gets a `video-poster` thumbnail strategy: a muted, tiny `<video>`
  // element renders the first frame in place of a generic icon.
  {
    extensions: ["mp4"],
    mime: "video/mp4",
    category: "VIDEO",
    subCategory: "MP4",
    displayName: "MP4 video",
    previewKind: "video",
    thumbnailStrategy: "video-poster",
    color: "text-purple-500",
    icon: Video,
    previewSizeCapOverride: null, // streamed inline — no cap
  },
  {
    extensions: ["mov"],
    mime: "video/quicktime",
    category: "VIDEO",
    subCategory: "MOV",
    displayName: "QuickTime video",
    previewKind: "video",
    thumbnailStrategy: "video-poster",
    color: "text-purple-500",
    icon: Video,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["webm"],
    mime: "video/webm",
    category: "VIDEO",
    subCategory: "WEBM",
    displayName: "WebM video",
    previewKind: "video",
    thumbnailStrategy: "video-poster",
    color: "text-purple-500",
    icon: Video,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["mkv"],
    mime: "video/x-matroska",
    category: "VIDEO",
    subCategory: "MKV",
    displayName: "Matroska video",
    previewKind: "video",
    thumbnailStrategy: "video-poster",
    color: "text-purple-500",
    icon: Video,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["avi"],
    mime: "video/x-msvideo",
    category: "VIDEO",
    subCategory: "AVI",
    displayName: "AVI video",
    previewKind: "video",
    thumbnailStrategy: "video-poster",
    color: "text-purple-500",
    icon: Video,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["m4v"],
    mime: "video/mp4",
    category: "VIDEO",
    subCategory: "M4V",
    displayName: "iTunes video",
    previewKind: "video",
    thumbnailStrategy: "video-poster",
    color: "text-purple-500",
    icon: Video,
    previewSizeCapOverride: null,
  },

  // ────────────────────── AUDIO ──────────────────────
  // Audio thumbs stay as icons — waveform extraction is not worth the
  // bundle cost. Long-term: a backend cover-art / waveform field.
  {
    extensions: ["mp3"],
    mime: "audio/mpeg",
    category: "AUDIO",
    subCategory: "MP3",
    displayName: "MP3 audio",
    previewKind: "audio",
    thumbnailStrategy: "icon",
    color: "text-pink-500",
    icon: Music,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["wav"],
    mime: "audio/wav",
    category: "AUDIO",
    subCategory: "WAV",
    displayName: "WAV audio",
    previewKind: "audio",
    thumbnailStrategy: "icon",
    color: "text-pink-500",
    icon: Music,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["ogg"],
    mime: "audio/ogg",
    category: "AUDIO",
    subCategory: "OGG",
    displayName: "Ogg audio",
    previewKind: "audio",
    thumbnailStrategy: "icon",
    color: "text-pink-500",
    icon: Music,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["m4a"],
    mime: "audio/mp4",
    category: "AUDIO",
    subCategory: "M4A",
    displayName: "AAC audio (M4A)",
    previewKind: "audio",
    thumbnailStrategy: "icon",
    color: "text-pink-500",
    icon: Music,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["aac"],
    mime: "audio/aac",
    category: "AUDIO",
    subCategory: "AAC",
    displayName: "AAC audio",
    previewKind: "audio",
    thumbnailStrategy: "icon",
    color: "text-pink-500",
    icon: Music,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["flac"],
    mime: "audio/flac",
    category: "AUDIO",
    subCategory: "FLAC",
    displayName: "FLAC audio",
    previewKind: "audio",
    thumbnailStrategy: "icon",
    color: "text-pink-500",
    icon: Music,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["opus"],
    mime: "audio/opus",
    category: "AUDIO",
    subCategory: "OPUS",
    displayName: "Opus audio",
    previewKind: "audio",
    thumbnailStrategy: "icon",
    color: "text-pink-500",
    icon: Music,
    previewSizeCapOverride: null,
  },

  // ────────────────────── PDF ──────────────────────
  {
    extensions: ["pdf"],
    mime: "application/pdf",
    category: "DOCUMENT",
    subCategory: "PDF",
    displayName: "PDF document",
    previewKind: "pdf",
    // First-page render via pdfjs is a future enhancement. For now we use the
    // category icon — pdfjs is too heavy to load just for thumbs in a folder
    // listing. When backend thumbs land we'll switch this to "backend-thumb".
    thumbnailStrategy: "icon",
    color: "text-red-500",
    icon: FileType,
    previewSizeCapOverride: null,
  },

  // ────────────────────── MARKDOWN ──────────────────────
  {
    extensions: ["md", "markdown"],
    mime: "text/markdown",
    category: "DOCUMENT",
    subCategory: "MARKDOWN",
    displayName: "Markdown",
    previewKind: "markdown",
    thumbnailStrategy: "icon",
    color: "text-slate-400",
    icon: FileText,
  },
  {
    extensions: ["mdx"],
    mime: "text/markdown",
    category: "DOCUMENT",
    subCategory: "MDX",
    displayName: "MDX (Markdown + JSX)",
    previewKind: "markdown",
    thumbnailStrategy: "icon",
    color: "text-slate-400",
    icon: FileText,
  },

  // ────────────────────── PLAIN TEXT / LOG / SUBTITLES ──────────────────────
  {
    extensions: ["txt"],
    mime: "text/plain",
    category: "DOCUMENT",
    subCategory: "PLAIN",
    displayName: "Plain text",
    previewKind: "text",
    thumbnailStrategy: "icon",
    color: "text-muted-foreground",
    icon: FileText,
  },
  {
    extensions: ["log"],
    mime: "text/plain",
    category: "DOCUMENT",
    subCategory: "LOG",
    displayName: "Log file",
    previewKind: "text",
    thumbnailStrategy: "icon",
    color: "text-muted-foreground",
    icon: FileText,
  },
  {
    extensions: ["srt"],
    mime: "application/x-subrip",
    category: "SUBTITLES",
    subCategory: "SRT",
    displayName: "SubRip subtitles",
    previewKind: "text",
    thumbnailStrategy: "icon",
    color: "text-cyan-500",
    icon: Subtitles,
  },
  {
    extensions: ["vtt"],
    mime: "text/vtt",
    category: "SUBTITLES",
    subCategory: "VTT",
    displayName: "WebVTT subtitles",
    previewKind: "text",
    thumbnailStrategy: "icon",
    color: "text-cyan-500",
    icon: Subtitles,
  },

  // ────────────────────── CODE ──────────────────────
  {
    extensions: ["js", "mjs", "cjs"],
    mime: "text/javascript",
    category: "CODE",
    subCategory: "JAVASCRIPT",
    displayName: "JavaScript",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-yellow-500",
    icon: FileCode,
  },
  {
    extensions: ["jsx"],
    mime: "text/javascript",
    category: "CODE",
    subCategory: "JAVASCRIPT",
    displayName: "JSX",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-yellow-500",
    icon: FileCode,
  },
  {
    extensions: ["ts"],
    mime: "text/typescript",
    category: "CODE",
    subCategory: "TYPESCRIPT",
    displayName: "TypeScript",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-blue-500",
    icon: FileCode,
  },
  {
    extensions: ["tsx"],
    mime: "text/typescript",
    category: "CODE",
    subCategory: "TYPESCRIPT",
    displayName: "TSX",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-blue-500",
    icon: FileCode,
  },
  {
    extensions: ["py"],
    mime: "text/x-python",
    category: "CODE",
    subCategory: "PYTHON",
    displayName: "Python",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-emerald-500",
    icon: Code,
  },
  {
    extensions: ["rb"],
    mime: "text/x-ruby",
    category: "CODE",
    subCategory: "RUBY",
    displayName: "Ruby",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-red-500",
    icon: Code,
  },
  {
    extensions: ["go"],
    mime: "text/x-go",
    category: "CODE",
    subCategory: "GO",
    displayName: "Go",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-cyan-500",
    icon: Code,
  },
  {
    extensions: ["rs"],
    mime: "text/x-rust",
    category: "CODE",
    subCategory: "RUST",
    displayName: "Rust",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-orange-600",
    icon: Code,
  },
  {
    extensions: ["java"],
    mime: "text/x-java",
    category: "CODE",
    subCategory: "JAVA",
    displayName: "Java",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-red-600",
    icon: Code,
  },
  {
    extensions: ["swift"],
    mime: "text/x-swift",
    category: "CODE",
    subCategory: "SWIFT",
    displayName: "Swift",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-orange-500",
    icon: Code,
  },
  {
    extensions: ["c", "h"],
    mime: "text/x-c",
    category: "CODE",
    subCategory: "C",
    displayName: "C",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-blue-600",
    icon: Code,
  },
  {
    extensions: ["cpp", "cc", "cxx", "hpp"],
    mime: "text/x-c++",
    category: "CODE",
    subCategory: "CPP",
    displayName: "C++",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-blue-700",
    icon: Code,
  },
  {
    extensions: ["cs"],
    mime: "text/x-csharp",
    category: "CODE",
    subCategory: "CSHARP",
    displayName: "C#",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-purple-600",
    icon: Code,
  },
  {
    extensions: ["html", "htm"],
    mime: "text/html",
    category: "CODE",
    subCategory: "HTML",
    displayName: "HTML",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-orange-400",
    icon: Code,
  },
  {
    extensions: ["css"],
    mime: "text/css",
    category: "CODE",
    subCategory: "CSS",
    displayName: "CSS",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-sky-400",
    icon: Code,
  },
  {
    extensions: ["scss"],
    mime: "text/x-scss",
    category: "CODE",
    subCategory: "SCSS",
    displayName: "SCSS",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-pink-400",
    icon: Code,
  },
  {
    extensions: ["sh", "bash", "zsh"],
    mime: "text/x-shellscript",
    category: "CODE",
    subCategory: "SHELL",
    displayName: "Shell script",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-emerald-400",
    icon: Code,
  },
  {
    extensions: ["sql"],
    mime: "application/sql",
    category: "CODE",
    subCategory: "SQL",
    displayName: "SQL",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-amber-400",
    icon: Code,
  },

  // ────────────────────── DATA / CONFIG ──────────────────────
  {
    extensions: ["json"],
    mime: "application/json",
    category: "DATA",
    subCategory: "JSON",
    displayName: "JSON",
    previewKind: "data",
    thumbnailStrategy: "icon",
    color: "text-amber-500",
    icon: FileJson,
  },
  {
    extensions: ["yaml", "yml"],
    mime: "application/yaml",
    category: "CODE",
    subCategory: "YAML",
    displayName: "YAML",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-amber-500",
    icon: Braces,
  },
  {
    extensions: ["toml"],
    mime: "application/toml",
    category: "CODE",
    subCategory: "TOML",
    displayName: "TOML",
    previewKind: "code",
    thumbnailStrategy: "icon",
    color: "text-amber-500",
    icon: Braces,
  },
  {
    extensions: ["xml"],
    mime: "application/xml",
    category: "DATA",
    subCategory: "XML",
    displayName: "XML",
    previewKind: "data",
    thumbnailStrategy: "icon",
    color: "text-amber-500",
    icon: Braces,
  },
  {
    extensions: ["csv"],
    mime: "text/csv",
    category: "DATA",
    subCategory: "CSV",
    displayName: "CSV",
    previewKind: "data",
    thumbnailStrategy: "icon",
    color: "text-orange-500",
    icon: FileSpreadsheet,
  },
  {
    extensions: ["tsv"],
    mime: "text/tab-separated-values",
    category: "DATA",
    subCategory: "TSV",
    displayName: "TSV",
    previewKind: "data",
    thumbnailStrategy: "icon",
    color: "text-orange-500",
    icon: FileSpreadsheet,
  },
  {
    extensions: ["sqlite", "sqlite3", "db"],
    mime: "application/x-sqlite3",
    category: "DATA",
    subCategory: "SQLITE",
    displayName: "SQLite database",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-blue-400",
    icon: Database,
  },

  // ────────────────────── SPREADSHEET (Excel) ──────────────────────
  {
    extensions: ["xlsx"],
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    category: "DOCUMENT",
    subCategory: "EXCEL",
    displayName: "Excel workbook",
    previewKind: "spreadsheet",
    thumbnailStrategy: "icon",
    color: "text-emerald-600",
    icon: FileSpreadsheet,
    previewSizeCapOverride: null,
  },
  {
    extensions: ["xls"],
    mime: "application/vnd.ms-excel",
    category: "DOCUMENT",
    subCategory: "EXCEL",
    displayName: "Excel workbook (legacy)",
    previewKind: "spreadsheet",
    thumbnailStrategy: "icon",
    color: "text-emerald-600",
    icon: FileSpreadsheet,
    previewSizeCapOverride: null,
  },

  // ────────────────────── OFFICE — NOT YET PREVIEWABLE ──────────────────────
  // Listed here so they get correct icons / categories. Full-text preview
  // requires a parser dependency (mammoth.js for docx, etc.) — tracked as a
  // follow-up. Today users see the icon and a Download button.
  {
    extensions: ["doc", "docx"],
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "DOCUMENT",
    subCategory: "WORD",
    displayName: "Word document",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-blue-500",
    icon: FileText,
  },
  {
    extensions: ["ppt", "pptx"],
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    category: "DOCUMENT",
    subCategory: "POWERPOINT",
    displayName: "PowerPoint",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-orange-600",
    icon: FileType,
  },

  // ────────────────────── NOTEBOOK ──────────────────────
  // .ipynb is JSON under the hood, so it works in our DataPreview today.
  // Eventually we'll ship a dedicated notebook renderer (cells + outputs).
  {
    extensions: ["ipynb"],
    mime: "application/x-ipynb+json",
    category: "NOTEBOOK",
    subCategory: "JUPYTER",
    displayName: "Jupyter notebook",
    previewKind: "data",
    thumbnailStrategy: "icon",
    color: "text-orange-400",
    icon: FileJson,
  },

  // ────────────────────── EBOOK ──────────────────────
  {
    extensions: ["epub"],
    mime: "application/epub+zip",
    category: "EBOOK",
    subCategory: "EPUB",
    displayName: "EPUB ebook",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-indigo-500",
    icon: FileText,
  },

  // ────────────────────── EMAIL ──────────────────────
  {
    extensions: ["eml"],
    mime: "message/rfc822",
    category: "EMAIL",
    subCategory: "EML",
    displayName: "Email message",
    previewKind: "text",
    thumbnailStrategy: "icon",
    color: "text-blue-400",
    icon: FileText,
  },

  // ────────────────────── 3D / CAD ──────────────────────
  // No previewer yet (Three.js loader would be needed). Icons only.
  {
    extensions: ["glb", "gltf"],
    mime: "model/gltf-binary",
    category: "MODEL_3D",
    subCategory: "GLTF",
    displayName: "3D model (glTF)",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-violet-400",
    icon: Package,
  },
  {
    extensions: ["stl", "obj", "fbx"],
    mime: "model/stl",
    category: "MODEL_3D",
    subCategory: "MESH",
    displayName: "3D mesh",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-violet-400",
    icon: Package,
  },

  // ────────────────────── ARCHIVES ──────────────────────
  {
    extensions: ["zip"],
    mime: "application/zip",
    category: "ARCHIVE",
    subCategory: "ZIP",
    displayName: "ZIP archive",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-amber-600",
    icon: Archive,
  },
  {
    extensions: ["rar"],
    mime: "application/vnd.rar",
    category: "ARCHIVE",
    subCategory: "RAR",
    displayName: "RAR archive",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-amber-600",
    icon: Archive,
  },
  {
    extensions: ["7z"],
    mime: "application/x-7z-compressed",
    category: "ARCHIVE",
    subCategory: "7Z",
    displayName: "7-Zip archive",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-amber-600",
    icon: Archive,
  },
  {
    extensions: ["tar"],
    mime: "application/x-tar",
    category: "ARCHIVE",
    subCategory: "TAR",
    displayName: "TAR archive",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-amber-600",
    icon: Package,
  },
  {
    extensions: ["gz", "tgz"],
    mime: "application/gzip",
    category: "ARCHIVE",
    subCategory: "GZ",
    displayName: "Gzip archive",
    previewKind: "generic",
    thumbnailStrategy: "icon",
    color: "text-amber-600",
    icon: Package,
  },
];

// ---------------------------------------------------------------------------
// Defaults — used when an extension isn't in the registry.
// ---------------------------------------------------------------------------

const UNKNOWN_DETAILS: FileTypeDetails = {
  category: "UNKNOWN",
  subCategory: "UNKNOWN",
  displayName: "File",
  previewKind: "generic",
  thumbnailStrategy: "icon",
  color: "text-muted-foreground",
  icon: FileIcon,
  canPreview: false,
  previewSizeCapOverride: null,
  mime: "application/octet-stream",
};

const FOLDER_DETAILS: FileTypeDetails = {
  category: "FOLDER",
  subCategory: "FOLDER",
  displayName: "Folder",
  previewKind: "generic",
  thumbnailStrategy: "icon",
  color: "text-sky-500",
  icon: Folder,
  canPreview: false,
  previewSizeCapOverride: null,
  mime: "inode/directory",
};

// ---------------------------------------------------------------------------
// Lookup index — built once at module load.
// ---------------------------------------------------------------------------

const BY_EXTENSION = new Map<string, FileTypeEntry>();
const BY_MIME = new Map<string, FileTypeEntry>();
for (const entry of FILE_TYPES) {
  for (const ext of entry.extensions) BY_EXTENSION.set(ext.toLowerCase(), entry);
  // Only the first entry per MIME wins — important for shared MIMEs like
  // text/plain (txt + log) where the extension is the better key.
  if (!BY_MIME.has(entry.mime)) BY_MIME.set(entry.mime, entry);
}

function entryToDetails(entry: FileTypeEntry): FileTypeDetails {
  return {
    category: entry.category,
    subCategory: entry.subCategory,
    displayName: entry.displayName,
    previewKind: entry.previewKind,
    thumbnailStrategy: entry.thumbnailStrategy,
    color: entry.color,
    icon: entry.icon,
    canPreview: entry.previewKind !== "generic",
    previewSizeCapOverride:
      entry.previewSizeCapOverride !== undefined
        ? entry.previewSizeCapOverride
        : null,
    mime: entry.mime,
  };
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Lowercase extension without the dot, or "" if there isn't one. */
function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i <= 0 || i === filename.length - 1) return "";
  return filename.slice(i + 1).toLowerCase();
}

/** Look up details by file name (extension match). */
export function getFileTypeDetails(filename: string): FileTypeDetails {
  const entry = BY_EXTENSION.get(extOf(filename));
  return entry ? entryToDetails(entry) : UNKNOWN_DETAILS;
}

/** Folder details — used by sidebar + tree rendering. */
export function getFolderTypeDetails(open = false): FileTypeDetails {
  return open ? { ...FOLDER_DETAILS, icon: FolderOpen } : FOLDER_DETAILS;
}

/** Canonical MIME for an extension (or `application/octet-stream`). */
export function mimeFromFilename(filename: string): string {
  const entry = BY_EXTENSION.get(extOf(filename));
  return entry ? entry.mime : "application/octet-stream";
}

/**
 * Resolve a final MIME, preferring the server-supplied value when it's
 * meaningful, otherwise falling back to the extension table.
 */
export function resolveMime(
  explicit: string | null | undefined,
  filename: string,
): string {
  if (explicit && explicit !== "application/octet-stream") return explicit;
  return mimeFromFilename(filename);
}

/**
 * Given a (filename, mime, size) tuple, return the full preview profile —
 * what to render at full size, what to render in a grid thumbnail, whether
 * either is allowed at the file's current byte size, and the resolved MIME.
 *
 * This is THE function components should call. `getPreviewCapability` and
 * `useFileTypeDetails` are thin views on top.
 */
export interface FilePreviewProfile {
  details: FileTypeDetails;
  /** Effective `previewKind` after MIME-prefix override. */
  previewKind: PreviewKind;
  /** True when the type is renderable AND the byte size fits the cap. */
  canPreview: boolean;
  /** False = file is too big for inline preview; offer download instead. */
  sizeOk: boolean;
  /** The cap that was effectively applied (in bytes). */
  effectiveSizeCap: number;
  /** True iff the registry says this file should render a real thumbnail. */
  thumbnailStrategy: ThumbnailStrategy;
  /** Resolved canonical MIME. */
  mime: string;
}

export function getFilePreviewProfile(
  fileName: string,
  mimeType: string | null,
  fileSize: number | null,
): FilePreviewProfile {
  const mime = resolveMime(mimeType, fileName);
  const fromExt = getFileTypeDetails(fileName);

  // MIME-prefix override — handles "we got `image/avif` but the extension
  // table doesn't have .avif yet" and similar future-proofing.
  let kind: PreviewKind = fromExt.previewKind;
  let thumb: ThumbnailStrategy = fromExt.thumbnailStrategy;
  if (mime.startsWith("image/")) {
    kind = "image";
    thumb = "image";
  } else if (mime.startsWith("video/")) {
    kind = "video";
    thumb = thumb === "icon" ? "video-poster" : thumb;
  } else if (mime.startsWith("audio/")) {
    kind = "audio";
  } else if (mime === "application/pdf") {
    kind = "pdf";
  } else if (kind === "generic" && isTextMime(mime)) {
    kind = "text";
  }

  const canPreviewKind = kind !== "generic";

  const cap =
    fromExt.previewSizeCapOverride ??
    // Streamable kinds are always allowed regardless of size.
    (kind === "image" ||
    kind === "video" ||
    kind === "audio" ||
    kind === "pdf" ||
    kind === "spreadsheet"
      ? Number.POSITIVE_INFINITY
      : MAX_INLINE_PREVIEW_BYTES);

  const sizeOk = fileSize == null || fileSize <= cap;

  return {
    details: { ...fromExt, previewKind: kind, thumbnailStrategy: thumb },
    previewKind: kind,
    canPreview: canPreviewKind && sizeOk,
    sizeOk,
    effectiveSizeCap: cap,
    thumbnailStrategy: thumb,
    mime,
  };
}

// ---------------------------------------------------------------------------
// Mime-prefix helpers (kept pure so consumers can still ask "is this image?")
// ---------------------------------------------------------------------------

export function isTextMime(mime: string): boolean {
  if (mime.startsWith("text/")) return true;
  return (
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/yaml" ||
    mime === "application/x-yaml" ||
    mime === "application/toml" ||
    mime === "application/sql" ||
    mime === "application/x-subrip" ||
    mime === "message/rfc822"
  );
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

export function isAudioMime(mime: string): boolean {
  return mime.startsWith("audio/");
}

export function isPdfMime(mime: string): boolean {
  return mime === "application/pdf";
}

// ---------------------------------------------------------------------------
// Documentation helpers — exported so /admin pages or QA dashboards can
// render "what does cloud-files support today?" tables straight from the
// registry, without ever drifting from runtime behavior.
// ---------------------------------------------------------------------------

/** Every supported (extension, displayName, previewKind, thumbnailStrategy). */
export interface SupportedTypeRow {
  extensions: readonly string[];
  mime: string;
  category: FileCategory;
  displayName: string;
  previewKind: PreviewKind;
  thumbnailStrategy: ThumbnailStrategy;
  /** True when previewKind !== "generic" — i.e. we have a real previewer. */
  canPreview: boolean;
}

export function listSupportedTypes(): SupportedTypeRow[] {
  return FILE_TYPES.map((e) => ({
    extensions: e.extensions,
    mime: e.mime,
    category: e.category,
    displayName: e.displayName,
    previewKind: e.previewKind,
    thumbnailStrategy: e.thumbnailStrategy,
    canPreview: e.previewKind !== "generic",
  }));
}
