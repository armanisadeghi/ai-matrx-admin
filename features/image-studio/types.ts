/**
 * Image Studio types
 * Shared type surface for the client studio, the process API, and the
 * save API. Everything that crosses the network is declared here so the
 * client and server agree on the shape.
 */

import type { OutputFormat, StudioPreset } from "./presets";

export type { OutputFormat, StudioPreset };

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
    /** Public Supabase URL, set only once the variant is saved. */
    publicUrl?: string | null;
    /** Saved-to-library state — controlled by the save step. */
    savedAt?: string | null;
}

// ── Processing request / response ─────────────────────────────────────────

export interface ProcessVariantSpec {
    presetId: string;
    /** Override the preset's default format. */
    format?: OutputFormat;
    /** Override the default filename base. */
    filenameBase?: string;
}

export interface ProcessStudioRequestBody {
    /** Quality 1–100. Applies to jpeg/webp/avif only. */
    quality: number;
    /** Global output format when a preset doesn't define its own. */
    defaultFormat: OutputFormat;
    /** Background colour for transparent inputs (hex). */
    backgroundColor?: string;
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

// ── Save request / response ───────────────────────────────────────────────

export interface SaveStudioVariantInput {
    /** A data URL produced by the process route. */
    dataUrl: string;
    /** Filename to write in storage (without any user prefix). */
    filename: string;
    /** Optional preset id — stored alongside the file for lookup later. */
    presetId?: string;
}

export interface SaveStudioRequestBody {
    /** Supabase bucket (default: "userContent"). */
    bucket?: string;
    /** Folder under `{userId}/...` — slug-ified server-side. */
    folder?: string;
    /** Variants to persist. */
    variants: SaveStudioVariantInput[];
}

export interface SaveStudioResponseVariant {
    filename: string;
    presetId?: string;
    publicUrl: string;
    error?: string;
}

export interface SaveStudioResponse {
    bucket: string;
    folder: string;
    variants: SaveStudioResponseVariant[];
}
