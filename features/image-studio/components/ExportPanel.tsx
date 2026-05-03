"use client";

import React, { useState } from "react";
import {
    CloudUpload,
    Download,
    Eye,
    FileDown,
    FolderInput,
    Gauge,
    Loader2,
    Paintbrush,
    Zap,
    Zap,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ImageFit, ImagePosition, OutputFormat, StudioSourceFile } from "../types";
import { formatBytes } from "../utils/format-bytes";
import { CropControls } from "./CropControls";

const FORMATS: Array<{
    id: OutputFormat;
    label: string;
    blurb: string;
    supportsAlpha: boolean;
}> = [
    { id: "webp", label: "WebP", blurb: "Best balance — ~30% smaller than JPEG, alpha supported", supportsAlpha: true },
    { id: "avif", label: "AVIF", blurb: "Smallest files, slightly slower to decode", supportsAlpha: false },
    { id: "jpeg", label: "JPEG", blurb: "Universal support, no alpha", supportsAlpha: false },
    { id: "png", label: "PNG", blurb: "Lossless, best for logos/icons, alpha", supportsAlpha: true },
];

interface ExportPanelProps {
    format: OutputFormat;
    quality: number;
    backgroundColor: string;
    fit: ImageFit;
    position: ImagePosition;
    onFormatChange: (f: OutputFormat) => void;
    onQualityChange: (q: number) => void;
    onBackgroundChange: (c: string) => void;
    onFitChange: (f: ImageFit) => void;
    onPositionChange: (p: ImagePosition) => void;

    isProcessing: boolean;
    isSaving: boolean;
    canGenerate: boolean;
    canDownload: boolean;
    canSave: boolean;

    filesCount: number;
    selectedPresetCount: number;
    totalVariantCount: number;
    generatedVariantCount: number;
    totalOutputBytes: number;
    selectedVariantCount: number;

    onGenerate: () => void;
    onDownloadAll: () => void;
    onDownloadSelected: () => void;
    /**
     * Save all generated variants to the user's library. `makePublic`
     * controls visibility — when true, files become public and the
     * response carries permanent CDN URLs safe to share. When false
     * (default), they're private and require auth to view.
     */
    onSaveAll: (folder: string, makePublic: boolean) => void;
    onOpenPreview?: () => void;
    canOpenPreview?: boolean;
    isPreviewOpen?: boolean;
    onDescribeAll?: () => void;
    isDescribing?: boolean;
    describedFileCount?: number;
}

export function ExportPanel({
    format,
    quality,
    backgroundColor,
    fit,
    position,
    onFormatChange,
    onQualityChange,
    onBackgroundChange,
    onFitChange,
    onPositionChange,

    isProcessing,
    isSaving,
    canGenerate,
    canDownload,
    canSave,

    filesCount,
    selectedPresetCount,
    totalVariantCount,
    generatedVariantCount,
    totalOutputBytes,
    selectedVariantCount,

    onGenerate,
    onDownloadAll,
    onDownloadSelected,
    onSaveAll,
    onOpenPreview,
    canOpenPreview = false,
    isPreviewOpen = false,
    onDescribeAll,
    isDescribing = false,
    describedFileCount = 0,
}: ExportPanelProps) {
    const [folder, setFolder] = useState("image-studio");
    const [makePublic, setMakePublic] = useState(false);

    return (
        <aside className="flex flex-col h-full min-h-0 border-l border-border bg-card/50">
            <div className="p-3 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                    Output controls
                </h3>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-5">
                {/* Crop & fit — placed FIRST because it's the most common gotcha */}
                <CropControls
                    fit={fit}
                    position={position}
                    onFitChange={onFitChange}
                    onPositionChange={onPositionChange}
                />

                {onOpenPreview && (
                    <button
                        type="button"
                        onClick={onOpenPreview}
                        disabled={!canOpenPreview}
                        className={cn(
                            "w-full h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                            isPreviewOpen
                                ? "bg-primary/10 border border-primary text-primary"
                                : canOpenPreview
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "bg-muted text-muted-foreground cursor-not-allowed",
                        )}
                        title={
                            canOpenPreview
                                ? isPreviewOpen
                                    ? "Preview window is already open"
                                    : "Open a floating live crop preview"
                                : "Add at least one file and pick a preset first"
                        }
                    >
                        <Eye className="h-3.5 w-3.5" />
                        {isPreviewOpen
                            ? "Preview open — focus it"
                            : "Open live crop preview"}
                    </button>
                )}

                <div className="h-px bg-border" />

                {/* Format */}
                <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                        Default format
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                        {FORMATS.map((f) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => onFormatChange(f.id)}
                                title={f.blurb}
                                className={cn(
                                    "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                                    format === f.id
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border bg-background hover:bg-muted/40",
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        {FORMATS.find((f) => f.id === format)?.blurb}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        Presets that specify their own format (favicons → PNG, avatars → WebP)
                        keep their defaults.
                    </p>
                </div>

                {/* Quality */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                            Quality
                        </label>
                        <span className="font-mono text-xs tabular-nums">
                            {quality}%
                        </span>
                    </div>
                    <Slider
                        value={[quality]}
                        min={30}
                        max={100}
                        step={1}
                        onValueChange={([v]) => onQualityChange(v)}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Smaller</span>
                        <span>Better</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        Applies to JPEG, WebP, and AVIF. PNG is always lossless.
                    </p>
                </div>

                {/* Background colour */}
                <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Paintbrush className="h-3 w-3" />
                        Transparent fill
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => onBackgroundChange(e.target.value)}
                                className="h-8 w-8 rounded-md border border-border cursor-pointer"
                            />
                        </div>
                        <input
                            type="text"
                            value={backgroundColor}
                            onChange={(e) => onBackgroundChange(e.target.value)}
                            className="flex-1 h-8 rounded-md border border-border bg-background px-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="#ffffff"
                        />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        JPEG/AVIF don't support alpha. Transparent pixels are filled with this
                        colour when converting.
                    </p>
                </div>

                {/* Summary stats */}
                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Source files</span>
                        <span className="font-mono tabular-nums">{filesCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Selected presets</span>
                        <span className="font-mono tabular-nums">{selectedPresetCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total variants</span>
                        <span className="font-mono tabular-nums">
                            {generatedVariantCount}
                            {totalVariantCount > 0 && ` / ${totalVariantCount}`}
                        </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                        <span className="text-muted-foreground">Output size</span>
                        <span className="font-mono tabular-nums flex items-center gap-1">
                            {totalOutputBytes > 0 && <Zap className="h-3 w-3 text-success" />}
                            {formatBytes(totalOutputBytes)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Actions ────────────────────────────────────── */}
            <div className="p-3 border-t border-border space-y-2 bg-card/80">
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={!canGenerate || isProcessing}
                    className={cn(
                        "w-full h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all",
                        canGenerate && !isProcessing
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                            : "bg-muted text-muted-foreground cursor-not-allowed",
                    )}
                >
                    <Zap
                        className={cn(
                            "h-4 w-4",
                            isProcessing && "animate-pulse",
                        )}
                    />
                    {isProcessing ? "Generating…" : "Generate all variants"}
                </button>

                {onDescribeAll && (
                    <button
                        type="button"
                        onClick={onDescribeAll}
                        disabled={filesCount === 0 || isDescribing}
                        className={cn(
                            "w-full h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                            filesCount > 0 && !isDescribing
                                ? "border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                                : "bg-muted text-muted-foreground border border-border cursor-not-allowed",
                        )}
                        title={
                            filesCount === 0
                                ? "Drop an image first"
                                : "Run the describe agent on every file — generates filename, alt text, caption, SEO copy, and dominant colours per file"
                        }
                    >
                        {isDescribing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Zap className="h-3.5 w-3.5" />
                        )}
                        {isDescribing
                            ? "Describing with AI…"
                            : describedFileCount > 0 && describedFileCount === filesCount
                              ? "Re-describe all with AI"
                              : describedFileCount > 0
                                ? `Describe remaining (${filesCount - describedFileCount})`
                                : "Describe all with AI"}
                    </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={onDownloadSelected}
                        disabled={selectedVariantCount === 0}
                        className="h-9 rounded-md border border-border text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Download only the selected variants as a ZIP"
                    >
                        <FileDown className="h-3.5 w-3.5" />
                        Selected ({selectedVariantCount})
                    </button>
                    <button
                        type="button"
                        onClick={onDownloadAll}
                        disabled={!canDownload}
                        className="h-9 rounded-md border border-border text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title="Download every variant across all files as a ZIP"
                    >
                        <Download className="h-3.5 w-3.5" />
                        All ({generatedVariantCount})
                    </button>
                </div>

                <div className="pt-1.5 border-t border-border">
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
                        <FolderInput className="h-3 w-3" />
                        Save to library — folder
                    </label>
                    <div className="flex gap-1.5">
                        <input
                            type="text"
                            value={folder}
                            onChange={(e) => setFolder(e.target.value)}
                            className="flex-1 h-8 rounded-md border border-border bg-background px-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="image-studio"
                        />
                    </div>
                    <label className="mt-1.5 flex items-start gap-2 text-xs cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={makePublic}
                            onChange={(e) => setMakePublic(e.target.checked)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                        />
                        <span className="leading-snug">
                            <span className="font-medium">Make publicly viewable</span>
                            <span className="block text-[10px] text-muted-foreground">
                                Returns permanent CDN URLs anyone can load — safe to share.
                                Leave unchecked to keep variants private to your account.
                            </span>
                        </span>
                    </label>
                    <button
                        type="button"
                        onClick={() => onSaveAll(folder, makePublic)}
                        disabled={!canSave || isSaving}
                        className={cn(
                            "mt-1.5 w-full h-9 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
                            canSave && !isSaving
                                ? "bg-success/10 border border-success/40 text-success hover:bg-success/20"
                                : "bg-muted text-muted-foreground border border-border cursor-not-allowed",
                        )}
                    >
                        <CloudUpload className="h-3.5 w-3.5" />
                        {isSaving
                            ? "Saving…"
                            : makePublic
                                ? "Save all to library (public)"
                                : "Save all to library (private)"}
                    </button>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                        Uploads every generated variant to your cloud-files library under
                        {" "}
                        <code className="font-mono">Images/Generated/{folder || "image-studio"}</code>.
                    </p>
                </div>
            </div>
        </aside>
    );
}
