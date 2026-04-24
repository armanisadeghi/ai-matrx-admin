/**
 * Image Studio types
 * Shared type surface for the client studio, the process API, and the
 * save API. Everything that crosses the network is declared here so the
 * client and server agree on the shape.
 */

import type { OutputFormat, StudioPreset } from "./presets";

export type { OutputFormat, StudioPreset };

/**
 * Fit mode — controls what happens when the preset's aspect ratio doesn't
 * match the source.
 *
 *   - cover   Fill the whole target; crop overflow. (Default.)
 *   - contain Letterbox the full image inside the target; pad with bg.
 *   - inside  Shrink to fit inside the target, keep aspect ratio.
 *             No crop, no upscale, no padding — output may be smaller.
 */
export type ImageFit = "cover" | "contain" | "inside";

/**
 * Focal point for cover mode. The 9 compass values are standard crops;
 * `entropy` and `attention` use Sharp's smart-crop algorithms to pick the
 * most interesting region automatically.
 */
export type ImagePosition =
    | "center"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "entropy"
    | "attention";

// ── Client-side file state ────────────────────────────────────────────────

export type StudioFileStatus =
    | "idle"
    | "reading"
    | "processing"
    | "processed"
    | "error";

export interface StudioSourceFile {
    /** Client-side id, not tied to storage. */
    id: string;
    /** Original file name (used as default filename base). */
    originalName: string;
    /** MIME type the browser reported. */
    mimeType: string;
    /** Original byte size. */
    size: number;
    /** Original image dimensions (once decoded). */
    width: number | null;
    height: number | null;
    /** Object URL for showing the original in the UI. Revoke on unmount. */
    objectUrl: string;
    /** Base (slug) used in generated filenames. */
    filenameBase: string;
    /** Lifecycle state for progress UI. */
    status: StudioFileStatus;
    /** Human-readable error if status === "error". */
    error?: string | null;
    /** The produced variants, keyed by preset id. */
    variants: Record<string, ProcessedVariant>;
    /** Raw File for re-processing. */
    file: File;
}

export interface ProcessedVariant {
    /** The preset this variant was generated from. */
    presetId: string;
    /** Filename with extension. */
    filename: string;
    /** Final dimensions written by Sharp. */
    width: number;
    height: number;
    /** Output format applied. */
    format: OutputFormat;
    /** Quality (1–100) applied — null for PNG. */
    quality: number | null;
    /** Output byte size. */
    size: number;
    /** Base64 data URL for in-browser preview + single-file download. */
    dataUrl: string;
    /** Compression ratio: (1 - size/originalSize) * 100. Cached once. */
    compressionRatio: number | null;
    /** Fit mode actually applied. */
    fit: ImageFit;
    /** Position actually applied (cover only). */
    position: ImagePosition | null;
    /** Cloud-files file id once the variant has been saved to the library. */
    fileId?: string | null;
    /** Saved-to-library state — controlled by the save step. */
    savedAt?: string | null;
}

export interface SaveStudioResult {
    /** Logical folder path the variants landed in (e.g. "Images/Generated/image-studio/my-set"). */
    folderPath: string;
    /** Cloud-files parent folder id. */
    parentFolderId: string;
    /** Number of variants that uploaded successfully. */
    savedCount: number;
    /** Filenames that failed to upload (if any). */
    failedFilenames: string[];
}

// ── Processing request / response ─────────────────────────────────────────

export interface ProcessVariantSpec {
    presetId: string;
    /** Override the preset's default format. */
    format?: OutputFormat;
    /** Override the default filename base. */
    filenameBase?: string;
    /** Per-variant fit override (default: spec.defaultFit). */
    fit?: ImageFit;
    /** Per-variant focal point (cover mode only). */
    position?: ImagePosition;
}

export interface ProcessStudioRequestBody {
    /** Quality 1–100. Applies to jpeg/webp/avif only. */
    quality: number;
    /** Global output format when a preset doesn't define its own. */
    defaultFormat: OutputFormat;
    /** Background colour for transparent inputs AND contain-mode padding (hex). */
    backgroundColor?: string;
    /** Default fit mode. Individual variants may override. */
    defaultFit?: ImageFit;
    /** Default focal point for cover mode. Individual variants may override. */
    defaultPosition?: ImagePosition;
    /** Preset ids + per-variant overrides. */
    variants: ProcessVariantSpec[];
    /** Filename base (falls back to uploaded filename without ext). */
    filenameBase: string;
}

export interface ProcessStudioResponseVariant {
    presetId: string;
    filename: string;
    format: OutputFormat;
    width: number;
    height: number;
    quality: number | null;
    size: number;
    dataUrl: string;
    compressionRatio: number | null;
    /** The fit mode actually applied (server resolves defaults + overrides). */
    fit: ImageFit;
    /** The position actually applied (cover mode only). */
    position: ImagePosition | null;
    error?: string;
}

export interface ProcessStudioResponse {
    original: {
        width: number;
        height: number;
        size: number;
        format: string;
    };
    variants: ProcessStudioResponseVariant[];
}

// ── Save pipeline (cloud-files) ───────────────────────────────────────────
// Saving is no longer a bespoke POST — variants are uploaded via the
// `uploadFiles` thunk from `@/features/files` after ensuring the target
// folder exists with `ensureFolderPath`. See `useImageStudio.saveAll`.
