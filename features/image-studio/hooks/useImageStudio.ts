"use client";

/**
 * useImageStudio — central state hook for the Image Studio tool.
 *
 * Tracks:
 *   - The source files the user has dropped
 *   - The set of selected preset ids (applied to all files)
 *   - Global format + quality + background colour overrides
 *   - The processing/save lifecycle
 *
 * Side effects:
 *   - Creates + revokes object URLs for the original previews
 *   - Calls /api/images/studio/process per file when the user clicks "Generate"
 *   - Calls /api/images/studio/save when the user clicks "Save to library"
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
    OutputFormat,
    ProcessStudioRequestBody,
    ProcessStudioResponse,
    ProcessedVariant,
    SaveStudioRequestBody,
    SaveStudioResponse,
    StudioSourceFile,
} from "../types";
import { slugifyFilename } from "../utils/slugify-filename";

const DEFAULT_QUALITY = 88;
const DEFAULT_FORMAT: OutputFormat = "webp";
const DEFAULT_BACKGROUND = "#ffffff";

export interface UseImageStudioOptions {
    /** Default folder path inside the Supabase bucket when saving. */
    defaultFolder?: string;
}

export interface UseImageStudioResult {
    files: StudioSourceFile[];
    selectedPresetIds: string[];
    format: OutputFormat;
    quality: number;
    backgroundColor: string;
    isProcessing: boolean;
    isSaving: boolean;
    lastSaveResult: SaveStudioResponse | null;
    error: string | null;

    // File management
    addFiles: (incoming: File[]) => Promise<void>;
    removeFile: (fileId: string) => void;
    clearAll: () => void;
    setFilenameBase: (fileId: string, base: string) => void;

    // Preset management
    togglePreset: (presetId: string) => void;
    selectPresets: (presetIds: string[]) => void;
    deselectAllPresets: () => void;
    applyBundle: (presetIds: string[]) => void;

    // Global controls
    setFormat: (format: OutputFormat) => void;
    setQuality: (quality: number) => void;
    setBackgroundColor: (color: string) => void;

    // Actions
    generate: () => Promise<void>;
    saveAll: (folder?: string) => Promise<void>;

    // Derived
    totalVariantCount: number;
    generatedVariantCount: number;
    totalOutputBytes: number;
}

let fileIdCounter = 0;
const nextFileId = () => `studio-file-${Date.now()}-${++fileIdCounter}`;

async function decodeDimensions(file: File): Promise<{ width: number; height: number } | null> {
    try {
        const objectUrl = URL.createObjectURL(file);
        return await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const w = img.naturalWidth;
                const h = img.naturalHeight;
                URL.revokeObjectURL(objectUrl);
                resolve({ width: w, height: h });
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(null);
            };
            img.src = objectUrl;
        });
    } catch {
        return null;
    }
}

export function useImageStudio(
    options: UseImageStudioOptions = {},
): UseImageStudioResult {
    const [files, setFiles] = useState<StudioSourceFile[]>([]);
    const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
    const [format, setFormat] = useState<OutputFormat>(DEFAULT_FORMAT);
    const [quality, setQuality] = useState<number>(DEFAULT_QUALITY);
    const [backgroundColor, setBackgroundColor] = useState<string>(DEFAULT_BACKGROUND);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveResult, setLastSaveResult] = useState<SaveStudioResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Revoke object URLs on unmount
    const urlsRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        const urls = urlsRef.current;
        return () => {
            for (const url of urls) URL.revokeObjectURL(url);
            urls.clear();
        };
    }, []);

    const addFiles = useCallback(async (incoming: File[]) => {
        const imageFiles = incoming.filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return;

        const added: StudioSourceFile[] = await Promise.all(
            imageFiles.map(async (file) => {
                const objectUrl = URL.createObjectURL(file);
                urlsRef.current.add(objectUrl);
                const dim = await decodeDimensions(file);
                const filenameBase = slugifyFilename(file.name);
                return {
                    id: nextFileId(),
                    originalName: file.name,
                    mimeType: file.type,
                    size: file.size,
                    width: dim?.width ?? null,
                    height: dim?.height ?? null,
                    objectUrl,
                    filenameBase,
                    status: "idle" as const,
                    error: null,
                    variants: {},
                    file,
                };
            }),
        );

        setFiles((prev) => [...prev, ...added]);
    }, []);

    const removeFile = useCallback((fileId: string) => {
        setFiles((prev) => {
            const target = prev.find((f) => f.id === fileId);
            if (target) {
                URL.revokeObjectURL(target.objectUrl);
                urlsRef.current.delete(target.objectUrl);
            }
            return prev.filter((f) => f.id !== fileId);
        });
    }, []);

    const clearAll = useCallback(() => {
        setFiles((prev) => {
            for (const f of prev) {
                URL.revokeObjectURL(f.objectUrl);
                urlsRef.current.delete(f.objectUrl);
            }
            return [];
        });
        setSelectedPresetIds([]);
        setLastSaveResult(null);
        setError(null);
    }, []);

    const setFilenameBase = useCallback((fileId: string, base: string) => {
        setFiles((prev) =>
            prev.map((f) =>
                f.id === fileId ? { ...f, filenameBase: slugifyFilename(base) } : f,
            ),
        );
    }, []);

    const togglePreset = useCallback((presetId: string) => {
        setSelectedPresetIds((prev) =>
            prev.includes(presetId)
                ? prev.filter((id) => id !== presetId)
                : [...prev, presetId],
        );
    }, []);

    const selectPresets = useCallback((presetIds: string[]) => {
        setSelectedPresetIds((prev) => {
            const set = new Set(prev);
            for (const id of presetIds) set.add(id);
            return Array.from(set);
        });
    }, []);

    const deselectAllPresets = useCallback(() => {
        setSelectedPresetIds([]);
    }, []);

    const applyBundle = useCallback((presetIds: string[]) => {
        setSelectedPresetIds(presetIds);
    }, []);

    // The core action: for each file, send it + the selected variants to the
    // process API, then fold the returned dataUrls back into the file entry.
    const generate = useCallback(async () => {
        if (files.length === 0 || selectedPresetIds.length === 0) return;
        setIsProcessing(true);
        setError(null);

        // Mark all in-flight files as processing
        setFiles((prev) =>
            prev.map((f) => ({ ...f, status: "processing", error: null, variants: {} })),
        );

        await Promise.all(
            files.map(async (sourceFile) => {
                const spec: ProcessStudioRequestBody = {
                    quality,
                    defaultFormat: format,
                    backgroundColor,
                    filenameBase: sourceFile.filenameBase,
                    variants: selectedPresetIds.map((presetId) => ({
                        presetId,
                        filenameBase: sourceFile.filenameBase,
                    })),
                };

                const formData = new FormData();
                formData.append("file", sourceFile.file);
                formData.append("spec", JSON.stringify(spec));

                try {
                    const res = await fetch("/api/images/studio/process", {
                        method: "POST",
                        body: formData,
                    });
                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(
                            (body as { error?: string }).error ?? `Process failed (${res.status})`,
                        );
                    }
                    const data = (await res.json()) as ProcessStudioResponse;

                    setFiles((prev) =>
                        prev.map((f) => {
                            if (f.id !== sourceFile.id) return f;
                            const variants: Record<string, ProcessedVariant> = {};
                            for (const v of data.variants) {
                                if (v.error || !v.dataUrl) continue;
                                variants[v.presetId] = {
                                    presetId: v.presetId,
                                    filename: v.filename,
                                    width: v.width,
                                    height: v.height,
                                    format: v.format,
                                    quality: v.quality,
                                    size: v.size,
                                    dataUrl: v.dataUrl,
                                    compressionRatio: v.compressionRatio,
                                    publicUrl: null,
                                    savedAt: null,
                                };
                            }
                            return {
                                ...f,
                                status: "processed",
                                error: null,
                                width: data.original.width || f.width,
                                height: data.original.height || f.height,
                                variants,
                            };
                        }),
                    );
                } catch (err) {
                    const msg = err instanceof Error ? err.message : "Failed to process";
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === sourceFile.id
                                ? { ...f, status: "error", error: msg }
                                : f,
                        ),
                    );
                }
            }),
        );

        setIsProcessing(false);
    }, [files, selectedPresetIds, quality, format, backgroundColor]);

    const saveAll = useCallback(
        async (folder?: string) => {
            const variantsToSave: SaveStudioRequestBody["variants"] = [];
            for (const f of files) {
                for (const v of Object.values(f.variants)) {
                    if (v.savedAt) continue; // skip already-saved
                    variantsToSave.push({
                        dataUrl: v.dataUrl,
                        filename: v.filename,
                        presetId: v.presetId,
                    });
                }
            }
            if (variantsToSave.length === 0) return;

            setIsSaving(true);
            setError(null);
            try {
                const res = await fetch("/api/images/studio/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        folder: folder ?? options.defaultFolder ?? "image-studio",
                        variants: variantsToSave,
                    } satisfies SaveStudioRequestBody),
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(
                        (body as { error?: string }).error ?? `Save failed (${res.status})`,
                    );
                }
                const data = (await res.json()) as SaveStudioResponse;
                setLastSaveResult(data);

                // Fold the public URLs back into state
                const urlByFilename = new Map<string, string>();
                for (const v of data.variants) {
                    if (v.publicUrl && !v.error) urlByFilename.set(v.filename, v.publicUrl);
                }
                const savedAt = new Date().toISOString();
                setFiles((prev) =>
                    prev.map((f) => {
                        const updated: Record<string, ProcessedVariant> = {};
                        for (const [id, v] of Object.entries(f.variants)) {
                            const publicUrl = urlByFilename.get(v.filename);
                            updated[id] = publicUrl
                                ? { ...v, publicUrl, savedAt }
                                : v;
                        }
                        return { ...f, variants: updated };
                    }),
                );
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Save failed";
                setError(msg);
            } finally {
                setIsSaving(false);
            }
        },
        [files, options.defaultFolder],
    );

    const totalVariantCount = useMemo(
        () => files.length * selectedPresetIds.length,
        [files.length, selectedPresetIds.length],
    );

    const generatedVariantCount = useMemo(
        () => files.reduce((sum, f) => sum + Object.keys(f.variants).length, 0),
        [files],
    );

    const totalOutputBytes = useMemo(
        () =>
            files.reduce(
                (sum, f) =>
                    sum + Object.values(f.variants).reduce((s, v) => s + v.size, 0),
                0,
            ),
        [files],
    );

    return {
        files,
        selectedPresetIds,
        format,
        quality,
        backgroundColor,
        isProcessing,
        isSaving,
        lastSaveResult,
        error,

        addFiles,
        removeFile,
        clearAll,
        setFilenameBase,

        togglePreset,
        selectPresets,
        deselectAllPresets,
        applyBundle,

        setFormat,
        setQuality,
        setBackgroundColor,

        generate,
        saveAll,

        totalVariantCount,
        generatedVariantCount,
        totalOutputBytes,
    };
}
