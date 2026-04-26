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
 *   - Dispatches cloud-files thunks when the user clicks "Save to library" —
 *     variants land under `Images/Generated/image-studio/{folder}` and are
 *     addressable by `fileId` from the cloudFiles slice thereafter.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ImageFit,
  ImagePosition,
  OutputFormat,
  ProcessStudioRequestBody,
  ProcessStudioResponse,
  ProcessedVariant,
  StudioSourceFile,
} from "../types";
import { slugifyFilename } from "../utils/slugify-filename";
import { useAppDispatch, useAppStore } from "@/lib/redux/hooks";
import { CloudFolders } from "@/features/files/utils/folder-conventions";
import { uploadFiles, ensureFolderPath } from "@/features/files/redux/thunks";

const DEFAULT_QUALITY = 88;
const DEFAULT_FORMAT: OutputFormat = "webp";
const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_FIT: ImageFit = "cover";
const DEFAULT_POSITION: ImagePosition = "center";

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
  fit: ImageFit;
  position: ImagePosition;
  isProcessing: boolean;
  isSaving: boolean;
  lastSaveResult: import("../types").SaveStudioResult | null;
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
  setFit: (fit: ImageFit) => void;
  setPosition: (position: ImagePosition) => void;

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

async function decodeDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
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
  const dispatch = useAppDispatch();
  const store = useAppStore();

  const [files, setFiles] = useState<StudioSourceFile[]>([]);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const [format, setFormat] = useState<OutputFormat>(DEFAULT_FORMAT);
  const [quality, setQuality] = useState<number>(DEFAULT_QUALITY);
  const [backgroundColor, setBackgroundColor] =
    useState<string>(DEFAULT_BACKGROUND);
  const [fit, setFit] = useState<ImageFit>(DEFAULT_FIT);
  const [position, setPosition] = useState<ImagePosition>(DEFAULT_POSITION);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveResult, setLastSaveResult] = useState<
    import("../types").SaveStudioResult | null
  >(null);
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
      prev.map((f) => ({
        ...f,
        status: "processing",
        error: null,
        variants: {},
      })),
    );

    await Promise.all(
      files.map(async (sourceFile) => {
        const spec: ProcessStudioRequestBody = {
          quality,
          defaultFormat: format,
          backgroundColor,
          defaultFit: fit,
          defaultPosition: position,
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
              (body as { error?: string }).error ??
                `Process failed (${res.status})`,
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
                  fit: v.fit,
                  position: v.position,
                  fileId: null,
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
  }, [
    files,
    selectedPresetIds,
    quality,
    format,
    backgroundColor,
    fit,
    position,
  ]);

  const saveAll = useCallback(
    async (folder?: string) => {
      // Collect every variant that hasn't been saved yet.
      const pending: Array<{
        studioFileId: string;
        variantKey: string;
        filename: string;
        presetId: string;
        dataUrl: string;
      }> = [];
      for (const f of files) {
        for (const [key, v] of Object.entries(f.variants)) {
          if (v.savedAt) continue;
          pending.push({
            studioFileId: f.id,
            variantKey: key,
            filename: v.filename,
            presetId: v.presetId,
            dataUrl: v.dataUrl,
          });
        }
      }
      if (pending.length === 0) return;

      setIsSaving(true);
      setError(null);

      try {
        // Convert every data URL into a real File so we can feed the
        // cloud-files upload pipeline. Filenames come from the server
        // (already preset-aware + slugged).
        const uploadables = await Promise.all(
          pending.map(async (p) => {
            const blob = await fetch(p.dataUrl).then((r) => r.blob());
            return {
              ...p,
              file: new File([blob], p.filename, {
                type: blob.type || "image/webp",
              }),
            };
          }),
        );

        // Anchor the save under the canonical Images/Generated tree so
        // everything the studio produces is grouped and filterable.
        const folderSegment = (
          folder ??
          options.defaultFolder ??
          "image-studio"
        )
          .trim()
          .replace(/^\/+|\/+$/g, "");
        const folderPath = folderSegment
          ? `${CloudFolders.IMAGES_GENERATED}/${folderSegment}`
          : CloudFolders.IMAGES_GENERATED;

        const parentFolderId = await dispatch(
          ensureFolderPath({ folderPath, visibility: "private" }),
        ).unwrap();

        // Snapshot existing file ids so we can detect which ones are
        // the new arrivals (uploadFiles runs workers in parallel and
        // doesn't preserve order in its `uploaded` array).
        const knownIdsBefore = new Set<string>(
          Object.keys(store.getState().cloudFiles.filesById),
        );

        const result = await dispatch(
          uploadFiles({
            files: uploadables.map((u) => u.file),
            parentFolderId,
            visibility: "private",
            metadata: {
              source: "image-studio",
              folder_segment: folderSegment,
            },
            concurrency: 3,
          }),
        ).unwrap();

        // Match new file ids back to variants by filename so we can
        // stamp each variant with its cloud `fileId`.
        const fresh = Object.values(
          store.getState().cloudFiles.filesById,
        ).filter((f) => !knownIdsBefore.has(f.id));
        const fileIdByName = new Map<string, string>();
        for (const file of fresh) {
          fileIdByName.set(file.fileName, file.id);
        }

        // `failed` shape changed in 2026-04-24: each entry is now
        // `{ name, error }` so the real backend error reaches callers
        // instead of just the filename. The set we build for variant-
        // matching only needs the names.
        const failedFilenamesSet = new Set<string>(
          result.failed.map((f) => f.name),
        );
        const savedAt = new Date().toISOString();

        setFiles((prev) =>
          prev.map((sourceFile) => {
            const nextVariants: Record<string, ProcessedVariant> = {};
            for (const [key, v] of Object.entries(sourceFile.variants)) {
              if (failedFilenamesSet.has(v.filename)) {
                nextVariants[key] = v; // leave unchanged on failure
                continue;
              }
              const fileId = fileIdByName.get(v.filename);
              if (!fileId) {
                nextVariants[key] = v; // couldn't correlate; treat as unsaved
                continue;
              }
              nextVariants[key] = { ...v, fileId, savedAt };
            }
            return { ...sourceFile, variants: nextVariants };
          }),
        );

        setLastSaveResult({
          folderPath,
          parentFolderId,
          savedCount: result.uploaded.length,
          failedFilenames: result.failed.map((f) => f.name),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed";
        setError(msg);
      } finally {
        setIsSaving(false);
      }
    },
    [dispatch, files, options.defaultFolder, store],
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
    fit,
    position,
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
    setFit,
    setPosition,

    generate,
    saveAll,

    totalVariantCount,
    generatedVariantCount,
    totalOutputBytes,
  };
}
