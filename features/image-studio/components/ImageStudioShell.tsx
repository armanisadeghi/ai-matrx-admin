"use client";

/**
 * ImageStudioShell
 *
 * The full interactive studio. Split into three columns:
 *   • Left   — PresetCatalog (search, bundles, categories)
 *   • Center — Drop zone + file cards with per-variant previews
 *   • Right  — ExportPanel (format, quality, generate/download/save actions)
 *
 * The whole thing is a client component; route wrappers render this inside a
 * server shell so the static header and grid structure are SSR-rendered for
 * zero layout shift.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PresetCatalog } from "./PresetCatalog";
import { StudioDropZone } from "./StudioDropZone";
import { StudioFileCard } from "./StudioFileCard";
import { ExportPanel } from "./ExportPanel";
import { CropPreviewWindow } from "./CropPreviewWindow";
import { useImageStudio } from "../hooks/useImageStudio";
import {
    downloadVariantsAsZip,
    type BundleEntry,
} from "../utils/download-bundle";
import type { ProcessedVariant } from "../types";

interface ImageStudioShellProps {
    /** Optional default folder for Save-to-library. */
    defaultFolder?: string;
}

export function ImageStudioShell({ defaultFolder }: ImageStudioShellProps) {
    const studio = useImageStudio({ defaultFolder });

    // Track bundle-action selection — a set of variant filenames currently
    // ticked across all files. Filenames are unique because they include
    // the preset id + the file's filename base.
    const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(
        new Set(),
    );

    // ── Crop preview window state ─────────────────────────────────────────
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewFileId, setPreviewFileId] = useState<string | null>(null);
    const [previewPresetId, setPreviewPresetId] = useState<string | null>(null);

    // Auto-pick sensible defaults so the window has something to show.
    useEffect(() => {
        if (!previewFileId && studio.files[0]) {
            setPreviewFileId(studio.files[0].id);
        }
    }, [previewFileId, studio.files]);
    useEffect(() => {
        if (
            (!previewPresetId || !studio.selectedPresetIds.includes(previewPresetId)) &&
            studio.selectedPresetIds[0]
        ) {
            setPreviewPresetId(studio.selectedPresetIds[0]);
        }
    }, [previewPresetId, studio.selectedPresetIds]);

    const openPreview = useCallback(
        (opts?: { fileId?: string; presetId?: string }) => {
            if (opts?.fileId) setPreviewFileId(opts.fileId);
            if (opts?.presetId) setPreviewPresetId(opts.presetId);
            setPreviewOpen(true);
        },
        [],
    );
    const toggleVariantSelect = useCallback((filename: string) => {
        setSelectedFilenames((prev) => {
            const next = new Set(prev);
            if (next.has(filename)) next.delete(filename);
            else next.add(filename);
            return next;
        });
    }, []);

    // Pluck (fileId, variant) pairs for bundle actions.
    const allGeneratedVariants = useMemo(() => {
        const pairs: Array<{ fileId: string; filenameBase: string; variant: ProcessedVariant }> = [];
        for (const f of studio.files) {
            for (const v of Object.values(f.variants)) {
                pairs.push({ fileId: f.id, filenameBase: f.filenameBase, variant: v });
            }
        }
        return pairs;
    }, [studio.files]);

    const handleDownloadAll = useCallback(async () => {
        if (allGeneratedVariants.length === 0) return;
        const entries: BundleEntry[] = allGeneratedVariants.map(({ filenameBase, variant }) => ({
            folder: studio.files.length > 1 ? filenameBase : undefined,
            filename: variant.filename,
            dataUrl: variant.dataUrl,
        }));
        try {
            await downloadVariantsAsZip(entries, `image-studio-${new Date().toISOString().slice(0, 10)}.zip`);
            toast.success(`Downloaded ${entries.length} variants as a ZIP`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "ZIP bundle failed";
            toast.error(msg);
        }
    }, [allGeneratedVariants, studio.files.length]);

    const handleDownloadSelected = useCallback(async () => {
        if (selectedFilenames.size === 0) return;
        const entries: BundleEntry[] = allGeneratedVariants
            .filter(({ variant }) => selectedFilenames.has(variant.filename))
            .map(({ filenameBase, variant }) => ({
                folder: studio.files.length > 1 ? filenameBase : undefined,
                filename: variant.filename,
                dataUrl: variant.dataUrl,
            }));
        if (entries.length === 0) return;
        try {
            await downloadVariantsAsZip(
                entries,
                `image-studio-selected-${new Date().toISOString().slice(0, 10)}.zip`,
            );
            toast.success(`Downloaded ${entries.length} selected variants`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "ZIP bundle failed";
            toast.error(msg);
        }
    }, [allGeneratedVariants, selectedFilenames, studio.files.length]);

    const handleSaveAll = useCallback(
        async (folder: string) => {
            await studio.saveAll(folder);
            if (!studio.error) {
                toast.success("Saved to your library");
            }
        },
        [studio],
    );

    const handleGenerate = useCallback(async () => {
        await studio.generate();
        if (studio.files.some((f) => f.status !== "error")) {
            toast.success(
                `Generated ${studio.files.length * studio.selectedPresetIds.length} variants`,
            );
        }
    }, [studio]);

    const handleDescribeAll = useCallback(async () => {
        if (studio.files.length === 0) return;
        const startedAt = Date.now();
        await studio.describeAll();
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        toast.success(`Described ${studio.files.length} file(s) in ${elapsed}s`);
    }, [studio]);

    return (
        <div className="flex h-full min-h-0">
            {/* LEFT — Preset Catalog ─────────────────────────── */}
            <div className="hidden md:flex flex-col w-72 lg:w-80 xl:w-96 border-r border-border bg-card/30 min-h-0">
                <PresetCatalog
                    selectedIds={studio.selectedPresetIds}
                    onToggle={(id) => {
                        studio.togglePreset(id);
                        // Focus the preview on whichever preset the user just picked.
                        if (!studio.selectedPresetIds.includes(id)) {
                            setPreviewPresetId(id);
                        }
                    }}
                    onApplyBundle={(ids) => {
                        studio.applyBundle(ids);
                        if (ids[0]) setPreviewPresetId(ids[0]);
                    }}
                    onDeselectAll={studio.deselectAllPresets}
                />
            </div>

            {/* CENTER — Work area ─────────────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-y-auto">
                <div className="p-4 md:p-5 space-y-4">
                    {studio.files.length === 0 ? (
                        <StudioDropZone onFilesAdded={studio.addFiles} />
                    ) : (
                        <>
                            <StudioDropZone
                                onFilesAdded={studio.addFiles}
                                compact
                            />
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                        {studio.files.length}
                                    </span>{" "}
                                    {studio.files.length === 1 ? "file" : "files"} ·
                                    <span className="font-medium text-foreground ml-1">
                                        {studio.selectedPresetIds.length}
                                    </span>{" "}
                                    selected presets
                                </p>
                                <button
                                    type="button"
                                    onClick={studio.clearAll}
                                    className="text-xs text-muted-foreground hover:text-destructive underline"
                                >
                                    Remove all
                                </button>
                            </div>
                            <div className="flex flex-col gap-3">
                                {studio.files.map((f) => (
                                    <StudioFileCard
                                        key={f.id}
                                        file={f}
                                        selectedPresetIds={studio.selectedPresetIds}
                                        selectedVariantFilenames={selectedFilenames}
                                        isPreviewActive={previewFileId === f.id && previewOpen}
                                        onToggleVariantSelect={toggleVariantSelect}
                                        onRemove={() => studio.removeFile(f.id)}
                                        onRename={(base) => studio.setFilenameBase(f.id, base)}
                                        onPreviewRequested={() =>
                                            openPreview({ fileId: f.id })
                                        }
                                        isDescribing={studio.describingFileIds.has(f.id)}
                                        onDescribe={() => studio.describeFile(f.id)}
                                        onMetadataPatch={(patch) =>
                                            studio.updateImageMetadata(f.id, patch)
                                        }
                                        onMetadataClear={() =>
                                            studio.clearImageMetadata(f.id)
                                        }
                                    />
                                ))}
                            </div>
                        </>
                    )}
                    {studio.error && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                            {studio.error}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT — Export panel ───────────────────────────── */}
            <div className="hidden lg:flex flex-col w-80 xl:w-96 min-h-0">
                <ExportPanel
                    format={studio.format}
                    quality={studio.quality}
                    backgroundColor={studio.backgroundColor}
                    fit={studio.fit}
                    position={studio.position}
                    onFormatChange={studio.setFormat}
                    onQualityChange={studio.setQuality}
                    onBackgroundChange={studio.setBackgroundColor}
                    onFitChange={studio.setFit}
                    onPositionChange={studio.setPosition}
                    isProcessing={studio.isProcessing}
                    isSaving={studio.isSaving}
                    canGenerate={
                        studio.files.length > 0 && studio.selectedPresetIds.length > 0
                    }
                    canDownload={studio.generatedVariantCount > 0}
                    canSave={studio.generatedVariantCount > 0}
                    filesCount={studio.files.length}
                    selectedPresetCount={studio.selectedPresetIds.length}
                    totalVariantCount={studio.totalVariantCount}
                    generatedVariantCount={studio.generatedVariantCount}
                    totalOutputBytes={studio.totalOutputBytes}
                    selectedVariantCount={selectedFilenames.size}
                    onGenerate={handleGenerate}
                    onDownloadAll={handleDownloadAll}
                    onDownloadSelected={handleDownloadSelected}
                    onSaveAll={handleSaveAll}
                    onOpenPreview={() => openPreview()}
                    canOpenPreview={studio.files.length > 0}
                    isPreviewOpen={previewOpen}
                    onDescribeAll={handleDescribeAll}
                    isDescribing={studio.isDescribing}
                    describedFileCount={
                        studio.files.filter((f) => f.imageMetadata).length
                    }
                />
            </div>

            {/* Live crop preview — floating WindowPanel */}
            {previewOpen && (
                <CropPreviewWindow
                    files={studio.files}
                    selectedPresetIds={studio.selectedPresetIds}
                    activeFileId={previewFileId}
                    activePresetId={previewPresetId}
                    onActiveFileChange={setPreviewFileId}
                    onActivePresetChange={setPreviewPresetId}
                    fit={studio.fit}
                    position={studio.position}
                    backgroundColor={studio.backgroundColor}
                    onPositionChange={studio.setPosition}
                    onClose={() => setPreviewOpen(false)}
                />
            )}
        </div>
    );
}
