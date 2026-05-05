"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Layers, PanelLeft, PanelRight, Edit3, X, Zap, Wand2 } from "lucide-react";
import { PresetCatalog } from "./PresetCatalog";
import { StudioDropZone } from "./StudioDropZone";
import { StudioFileCard } from "./StudioFileCard";
import { ExportPanel } from "./ExportPanel";
import { StudioActionBar } from "./StudioActionBar";
import { CropPreviewWindow } from "./CropPreviewWindow";
import { InitialCropDialog } from "./InitialCropDialog";
import { useImageStudio } from "@/features/images/hooks/useImageStudio";
import {
  downloadVariantsAsZip,
  type BundleEntry,
} from "@/features/images/utils/download-bundle";
import { slugifyFilename } from "@/features/images/utils/slugify-filename";
import { cn } from "@/lib/utils";
import type { ProcessedVariant } from "@/features/images/studio-types";

interface ImageStudioShellProps {
  defaultFolder?: string;
}

export function ImageStudioShell({ defaultFolder }: ImageStudioShellProps) {
  const studio = useImageStudio({ defaultFolder });

  const [selectedFilenames, setSelectedFilenames] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewPresetId, setPreviewPresetId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [renameAcknowledged, setRenameAcknowledged] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const renameActionsRef = useRef(new Map<string, () => void>());
  const registerRenameAction = useCallback(
    (fileId: string, action: (() => void) | null) => {
      if (action) renameActionsRef.current.set(fileId, action);
      else renameActionsRef.current.delete(fileId);
    },
    [],
  );

  useEffect(() => {
    setRenameAcknowledged(false);
  }, [studio.files.length, studio.describingFileIds]);

  const queueForCrop = useCallback((incoming: File[]) => {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setPendingFiles((prev) => [...prev, ...images]);
  }, []);

  const handleCropQueueComplete = useCallback(
    (results: File[]) => {
      setPendingFiles([]);
      void studio.addFiles(results);
    },
    [studio],
  );

  const handleCropQueueCancel = useCallback(() => {
    setPendingFiles([]);
  }, []);

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

  const allGeneratedVariants = useMemo(() => {
    const pairs: Array<{
      fileId: string;
      filenameBase: string;
      variant: ProcessedVariant;
    }> = [];
    for (const f of studio.files) {
      for (const v of Object.values(f.variants)) {
        pairs.push({ fileId: f.id, filenameBase: f.filenameBase, variant: v });
      }
    }
    return pairs;
  }, [studio.files]);

  const handleDownloadAll = useCallback(async () => {
    if (allGeneratedVariants.length === 0) return;
    const entries: BundleEntry[] = allGeneratedVariants.map(
      ({ filenameBase, variant }) => ({
        folder: studio.files.length > 1 ? filenameBase : undefined,
        filename: variant.filename,
        dataUrl: variant.dataUrl,
      }),
    );
    try {
      await downloadVariantsAsZip(
        entries,
        `image-studio-${new Date().toISOString().slice(0, 10)}.zip`,
      );
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
    async (folder: string, makePublic: boolean) => {
      await studio.saveAll(folder, {
        visibility: makePublic ? "public" : "private",
      });
      if (!studio.error) {
        toast.success(
          makePublic ? "Saved to your library (public)" : "Saved to your library",
        );
      }
    },
    [studio],
  );

  const autoNamedFileIds = useMemo(() => {
    const ids: string[] = [];
    for (const f of studio.files) {
      const looksAuto =
        f.filenameBase === slugifyFilename(f.originalName) && !f.imageMetadata;
      if (looksAuto) ids.push(f.id);
    }
    return ids;
  }, [studio.files]);

  const focusFirstAutoNamed = useCallback(() => {
    const id = autoNamedFileIds[0];
    if (!id) return;
    const action = renameActionsRef.current.get(id);
    action?.();
  }, [autoNamedFileIds]);

  const handleGenerate = useCallback(async () => {
    if (autoNamedFileIds.length > 0 && !renameAcknowledged) {
      setRenameAcknowledged(true);
      focusFirstAutoNamed();
      toast.warning(
        `${autoNamedFileIds.length} file${autoNamedFileIds.length === 1 ? "" : "s"} still uses an auto-generated name`,
        {
          description:
            "Rename them first or click Generate again to use the auto names.",
          duration: 4500,
        },
      );
      return;
    }
    await studio.generate();
    if (studio.files.some((f) => f.status !== "error")) {
      toast.success(
        `Generated ${studio.files.length * studio.selectedPresetIds.length} variants`,
      );
    }
  }, [studio, autoNamedFileIds, renameAcknowledged, focusFirstAutoNamed]);

  const handleDescribeAll = useCallback(async () => {
    if (studio.files.length === 0) return;
    const startedAt = Date.now();
    await studio.describeAll();
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    toast.success(`Described ${studio.files.length} file(s) in ${elapsed}s`);
  }, [studio]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border bg-card">
        <div className="rounded-md bg-muted p-1.5 border border-border">
          <Layers className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-none">Image Studio</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Batch resize and export across preset dimensions
          </p>
        </div>
        {/* Panel toggles */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLeftOpen((v) => !v)}
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
              leftOpen
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60",
            )}
            title={leftOpen ? "Hide preset catalog" : "Show preset catalog"}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setRightOpen((v) => !v)}
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
              rightOpen
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60",
            )}
            title={rightOpen ? "Hide output settings" : "Show output settings"}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Work area — panels are overlays */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">

        {/* Backdrop — dims canvas when a panel is open */}
        <div
          className={cn(
            "absolute inset-0 bg-black/50 z-10 cursor-pointer transition-opacity duration-200",
            leftOpen || rightOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onClick={() => { setLeftOpen(false); setRightOpen(false); }}
        />

        {/* LEFT — Preset Catalog (overlay) */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-20 flex flex-col w-80 xl:w-96 min-h-0",
            "border-r border-border bg-card rounded-r-lg shadow-[6px_0_32px_rgba(0,0,0,0.55)]",
            "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            !leftOpen && "-translate-x-full",
          )}
        >
          <PresetCatalog
            selectedIds={studio.selectedPresetIds}
            onToggle={(id) => {
              studio.togglePreset(id);
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

        {/* CENTER — Work area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-y-auto">
          <div className="p-4 md:p-5 space-y-3">
            {studio.files.length === 0 ? (
              <StudioDropZone onFilesAdded={queueForCrop} />
            ) : (
              <>
                <StudioDropZone onFilesAdded={queueForCrop} compact />

                {/* Slim rename banner */}
                {autoNamedFileIds.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/5 px-3 py-1.5 text-xs">
                    <Edit3 className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="flex-1 min-w-0 text-amber-900 dark:text-amber-200">
                      {autoNamedFileIds.length === 1
                        ? "1 file has an auto-generated name"
                        : `${autoNamedFileIds.length} files have auto-generated names`}
                      {" — rename for clean variant slugs"}
                    </span>
                    {renameAcknowledged && (
                      <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 shrink-0">
                        <Zap className="h-3 w-3" />
                        Click Generate to proceed
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={focusFirstAutoNamed}
                      className="text-amber-700 dark:text-amber-300 font-medium hover:underline shrink-0"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={handleDescribeAll}
                      className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium hover:underline shrink-0"
                    >
                      <Wand2 className="h-3 w-3" />
                      AI name
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenameAcknowledged(true)}
                      className="h-5 w-5 rounded flex items-center justify-center text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 shrink-0"
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    <span className="font-medium text-foreground">{studio.files.length}</span>{" "}
                    {studio.files.length === 1 ? "file" : "files"} ·{" "}
                    <span className="font-medium text-foreground">{studio.selectedPresetIds.length}</span>{" "}
                    selected presets
                  </span>
                  <button
                    type="button"
                    onClick={studio.clearAll}
                    className="hover:text-destructive underline transition-colors"
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
                      needsRename={autoNamedFileIds.includes(f.id)}
                      registerRenameAction={registerRenameAction}
                      onToggleVariantSelect={toggleVariantSelect}
                      onRemove={() => studio.removeFile(f.id)}
                      onRename={(base) => studio.setFilenameBase(f.id, base)}
                      onPreviewRequested={() => openPreview({ fileId: f.id })}
                      isDescribing={studio.describingFileIds.has(f.id)}
                      onDescribe={() => studio.describeFile(f.id)}
                      onMetadataPatch={(patch) =>
                        studio.updateImageMetadata(f.id, patch)
                      }
                      onMetadataClear={() => studio.clearImageMetadata(f.id)}
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

        {/* RIGHT — Export settings (overlay) */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 z-20 flex flex-col w-80 xl:w-96 min-h-0",
            "border-l border-border bg-card rounded-l-lg shadow-[-6px_0_32px_rgba(0,0,0,0.55)]",
            "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
            !rightOpen && "translate-x-full",
          )}
        >
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
            isSaving={studio.isSaving}
            canSave={studio.generatedVariantCount > 0}
            onSaveAll={handleSaveAll}
            onOpenPreview={() => openPreview()}
            canOpenPreview={studio.files.length > 0}
            isPreviewOpen={previewOpen}
          />
        </div>
      </div>

      {/* Bottom action bar — Magnific-style toolbar pill */}
      <StudioActionBar
        filesCount={studio.files.length}
        selectedPresetCount={studio.selectedPresetIds.length}
        totalVariantCount={studio.totalVariantCount}
        generatedVariantCount={studio.generatedVariantCount}
        totalOutputBytes={studio.totalOutputBytes}
        selectedVariantCount={selectedFilenames.size}
        isProcessing={studio.isProcessing}
        canGenerate={studio.files.length > 0 && studio.selectedPresetIds.length > 0}
        canDownload={studio.generatedVariantCount > 0}
        onGenerate={handleGenerate}
        onDownloadAll={handleDownloadAll}
        onDownloadSelected={handleDownloadSelected}
        onDescribeAll={handleDescribeAll}
        isDescribing={studio.isDescribing}
        describedFileCount={studio.files.filter((f) => f.imageMetadata).length}
        leftPanelOpen={leftOpen}
        rightPanelOpen={rightOpen}
        onToggleLeftPanel={() => setLeftOpen((v) => !v)}
        onToggleRightPanel={() => setRightOpen((v) => !v)}
      />

      {/* Live crop preview — floating */}
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

      <InitialCropDialog
        files={pendingFiles}
        onComplete={handleCropQueueComplete}
        onCancel={handleCropQueueCancel}
      />
    </div>
  );
}
