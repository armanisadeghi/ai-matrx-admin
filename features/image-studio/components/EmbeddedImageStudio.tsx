"use client";

/**
 * EmbeddedImageStudio
 * ─────────────────────────────────────────────────────────────────────────
 * Drop-in image-input component for any form that needs ONE source image
 * turned into N predefined platform variants — all with permanent
 * Cloudflare CDN URLs.
 *
 * Pipeline:
 *   1. Drop / paste / pick a file       → InitialCropDialog opens
 *   2. User crops (or skips)            → file is queued in a private studio
 *   3. User confirms the filename       → Sharp generates every preset
 *   4. Variants auto-upload as PUBLIC   → cloud-files returns CDN URLs
 *   5. Caller's `onSaved` receives      → { byPreset, primary, ... }
 *
 * The host form just plumbs the resulting URL(s) into its state. The
 * variants live in `Images/Generated/<rootSegment>/<filenameBase>/` so
 * everything for one source ships in one folder.
 *
 * Why this exists (not just `<ImageAssetUploader>`):
 *   - Auto-generates EVERY caller-requested preset, not just the one the
 *     UI surfaces. SavePageTab needs `og-image`, but the user gets a
 *     1400², 400², 128² as well — for free.
 *   - Always uploads via the cloud-files thunk → permanent CDN URLs that
 *     never expire. No more base64 data URLs in clipboards.
 *   - Per-source subfolders so 30 variants for one image stay grouped.
 *   - Filename-rename gate before mass variant creation.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Copy,
    Edit3,
    Eye,
    ExternalLink,
    Image as ImageIcon,
    Loader2,
    RefreshCw,
    Trash2,
    Wand2,
    Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useImageStudio } from "../hooks/useImageStudio";
import { getPresetById } from "../presets";
import { slugifyFilename } from "../utils/slugify-filename";
import { formatBytes, formatDimensions } from "../utils/format-bytes";
import type { ImagePosition, StudioSourceFile } from "../types";
import { StudioDropZone } from "./StudioDropZone";
import { InitialCropDialog } from "./InitialCropDialog";

// ── Public surface ───────────────────────────────────────────────────────

export interface EmbeddedImageStudioResult {
    /** Map of presetId → permanent public CDN URL for that variant. */
    byPreset: Record<string, string>;
    /**
     * The single "primary" URL the host cares about. Falls back to the
     * first preset id in `presetIds` if `primaryPresetId` wasn't set.
     */
    primary: { presetId: string; publicUrl: string } | null;
    /** What the user named the source — also the per-source subfolder. */
    filenameBase: string;
    /** Cloud-files folder id where everything was written. */
    parentFolderId: string;
}

export interface EmbeddedImageStudioProps {
    /**
     * Preset ids to auto-generate. Pulled from `presets.ts`. The component
     * pre-selects them on mount and generates them all the moment the user
     * clicks Generate.
     */
    presetIds: string[];

    /**
     * Folder segment under `Images/Generated/`. Defaults to the host
     * feature's identifier (e.g. "html-pages", "agent-apps"). Variants
     * land in `Images/Generated/<rootFolderSegment>/<filenameBase>/`.
     */
    rootFolderSegment?: string;

    /**
     * Default value for the source-file slug. The user can rename inline
     * before generating. Strongly recommended: pass the host's primary
     * label (e.g. the page title). Falls back to the original filename.
     */
    defaultFilenameBase?: string;

    /**
     * The preset whose URL the host cares about most. The result's
     * `primary` will be set to this one's public URL. Defaults to
     * `presetIds[0]`.
     */
    primaryPresetId?: string;

    /** Disable the whole component. */
    disabled?: boolean;

    /** Pre-existing public URL — shown as a thumbnail with a Replace CTA. */
    initialUrl?: string | null;

    /**
     * Fires once the public CDN URLs are available (after save completes).
     * Re-fires when the user replaces the image.
     */
    onSaved?: (result: EmbeddedImageStudioResult) => void;

    /** Fires when the user clears the image. */
    onCleared?: () => void;

    /** Optional UI label shown above the component. */
    label?: string;

    /** Extra wrapper class names. */
    className?: string;
}

// ── Component ────────────────────────────────────────────────────────────

export function EmbeddedImageStudio({
    presetIds,
    rootFolderSegment = "image-studio",
    defaultFilenameBase,
    primaryPresetId,
    disabled = false,
    initialUrl = null,
    onSaved,
    onCleared,
    label,
    className,
}: EmbeddedImageStudioProps) {
    const studio = useImageStudio({ defaultFolder: rootFolderSegment });

    // ── Local UI state ────────────────────────────────────────────────────
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [renamingNow, setRenamingNow] = useState(false);
    const [renameDraft, setRenameDraft] = useState("");
    const [showInitial, setShowInitial] = useState(Boolean(initialUrl));
    const [autoFlowError, setAutoFlowError] = useState<string | null>(null);

    // We don't auto-redo work, even if the parent re-renders us with the
    // same file. This guards generate+save against double-firing.
    const [pipelineState, setPipelineState] = useState<
        "idle" | "ready-to-generate" | "generating" | "saving" | "done" | "error"
    >("idle");

    // The component manages a single source file at a time. If the user
    // drops something while a previous result is showing, we clear and
    // start fresh.
    const sourceFile: StudioSourceFile | undefined = studio.files[0];

    // Pre-select the requested presets the moment the studio is ready.
    useEffect(() => {
        if (presetIds.length === 0) return;
        // Only set if different to avoid feedback loops.
        const same =
            studio.selectedPresetIds.length === presetIds.length &&
            studio.selectedPresetIds.every((id, i) => id === presetIds[i]);
        if (!same) studio.applyBundle(presetIds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [presetIds]);

    // ── Drop / crop queue ─────────────────────────────────────────────────
    const queueForCrop = useCallback(
        (incoming: File[]) => {
            if (disabled) return;
            const images = incoming.filter((f) => f.type.startsWith("image/"));
            if (images.length === 0) return;
            // Replace existing source — single-file scope.
            studio.clearAll();
            setPipelineState("idle");
            setAutoFlowError(null);
            setShowInitial(false);
            setPendingFiles(images.slice(0, 1));
        },
        [disabled, studio],
    );

    const handleCropComplete = useCallback(
        async (results: File[]) => {
            setPendingFiles([]);
            await studio.addFiles(results);
            // Apply the default filename base IF the original-name slug
            // would override a more meaningful caller-provided default.
            const dropped = results[0];
            if (dropped && defaultFilenameBase) {
                const desired = slugifyFilename(defaultFilenameBase);
                if (desired) {
                    // The store's addFiles already auto-set filenameBase
                    // to the original name's slug — overwrite to the
                    // caller's preference if they bothered to set one.
                    queueMicrotask(() => {
                        const f = studio.files[0];
                        if (f) studio.setFilenameBase(f.id, desired);
                    });
                }
            }
            setPipelineState("ready-to-generate");
        },
        [studio, defaultFilenameBase],
    );

    const handleCropCancel = useCallback(() => {
        setPendingFiles([]);
    }, []);

    // ── Rename ────────────────────────────────────────────────────────────
    const startRename = useCallback(() => {
        if (!sourceFile) return;
        setRenameDraft(sourceFile.filenameBase);
        setRenamingNow(true);
    }, [sourceFile]);

    const commitRename = useCallback(() => {
        if (!sourceFile) return;
        const next = slugifyFilename(renameDraft);
        if (next) studio.setFilenameBase(sourceFile.id, next);
        setRenamingNow(false);
    }, [sourceFile, renameDraft, studio]);

    // ── Pipeline: Generate → Save (auto) ──────────────────────────────────
    const runPipeline = useCallback(async () => {
        if (!sourceFile) return;
        setAutoFlowError(null);
        setPipelineState("generating");
        try {
            await studio.generate();
            const errored = studio.files.some((f) => f.status === "error");
            if (errored) {
                throw new Error("One or more variants failed to generate");
            }
            setPipelineState("saving");
            await studio.saveAll(rootFolderSegment, { visibility: "public" });
            setPipelineState("done");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Pipeline failed";
            setAutoFlowError(msg);
            setPipelineState("error");
            toast.error(msg);
        }
    }, [sourceFile, studio, rootFolderSegment]);

    // After saveAll resolves we fold the public URLs back to the host.
    useEffect(() => {
        if (pipelineState !== "done") return;
        const f = studio.files[0];
        if (!f) return;
        const byPreset: Record<string, string> = {};
        for (const presetId of presetIds) {
            const v = f.variants[presetId];
            if (v?.publicUrl) byPreset[presetId] = v.publicUrl;
        }
        const primaryId = primaryPresetId ?? presetIds[0] ?? null;
        const primaryUrl = primaryId ? byPreset[primaryId] : null;
        const result: EmbeddedImageStudioResult = {
            byPreset,
            primary:
                primaryId && primaryUrl
                    ? { presetId: primaryId, publicUrl: primaryUrl }
                    : null,
            filenameBase: f.filenameBase,
            parentFolderId: studio.lastSaveResult?.parentFolderId ?? "",
        };
        onSaved?.(result);
    }, [
        pipelineState,
        studio.files,
        studio.lastSaveResult,
        presetIds,
        primaryPresetId,
        onSaved,
    ]);

    // ── Reset / replace ───────────────────────────────────────────────────
    const handleReplace = useCallback(() => {
        studio.clearAll();
        setPipelineState("idle");
        setShowInitial(false);
        setAutoFlowError(null);
    }, [studio]);

    const handleClear = useCallback(() => {
        studio.clearAll();
        setPipelineState("idle");
        setShowInitial(false);
        setAutoFlowError(null);
        onCleared?.();
    }, [studio, onCleared]);

    // ── Render ────────────────────────────────────────────────────────────

    // 1) Pre-existing initial URL — show as a thumbnail with a Replace CTA.
    if (showInitial && initialUrl && !sourceFile) {
        return (
            <Wrapper label={label} className={className}>
                <InitialUrlBanner
                    url={initialUrl}
                    onReplace={handleReplace}
                    onClear={handleClear}
                    disabled={disabled}
                />
            </Wrapper>
        );
    }

    // 2) No file yet → drop zone.
    if (!sourceFile) {
        return (
            <Wrapper label={label} className={className}>
                <StudioDropZone onFilesAdded={queueForCrop} />
                <InitialCropDialog
                    files={pendingFiles}
                    onComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            </Wrapper>
        );
    }

    // 3) Source file present — render the full pipeline UI.
    return (
        <Wrapper label={label} className={className}>
            <SourceHeader
                file={sourceFile}
                renaming={renamingNow}
                renameDraft={renameDraft}
                onRenameStart={startRename}
                onRenameCommit={commitRename}
                onRenameCancel={() => setRenamingNow(false)}
                onRenameDraftChange={setRenameDraft}
                onReplace={handleReplace}
                onClear={handleClear}
                disabled={disabled || pipelineState === "saving"}
            />

            {/* Pipeline status / Generate trigger */}
            {pipelineState === "ready-to-generate" && (
                <ReadyToGenerateBar
                    onGenerate={runPipeline}
                    presetCount={presetIds.length}
                    disabled={disabled}
                />
            )}
            {pipelineState === "generating" && (
                <PipelineStatusBar
                    icon={<Loader2 className="h-4 w-4 animate-spin" />}
                    label="Generating variants…"
                    description={`Sharp is producing ${presetIds.length} sizes from your image.`}
                />
            )}
            {pipelineState === "saving" && (
                <PipelineStatusBar
                    icon={<Loader2 className="h-4 w-4 animate-spin" />}
                    label="Uploading to library…"
                    description="Each variant gets its permanent Cloudflare CDN URL."
                />
            )}
            {pipelineState === "done" && (
                <PipelineStatusBar
                    icon={<CheckCircle2 className="h-4 w-4 text-success" />}
                    label="All variants saved with public CDN URLs"
                    description="Copy a URL below — they never expire."
                    success
                />
            )}
            {pipelineState === "error" && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="font-medium">Pipeline failed</p>
                        <p className="text-xs">{autoFlowError ?? "Unknown error"}</p>
                    </div>
                    <button
                        type="button"
                        onClick={runPipeline}
                        className="text-xs rounded-md border border-destructive/40 hover:bg-destructive/10 px-2 py-1"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Variants grid */}
            <VariantGrid
                file={sourceFile}
                presetIds={presetIds}
                primaryPresetId={primaryPresetId ?? presetIds[0]}
                pipelineState={pipelineState}
            />
        </Wrapper>
    );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function Wrapper({
    label,
    className,
    children,
}: {
    label?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={cn("flex flex-col gap-3", className)}>
            {label && (
                <p className="text-sm font-medium flex items-center gap-1.5 text-foreground">
                    <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {label}
                </p>
            )}
            {children}
        </div>
    );
}

function InitialUrlBanner({
    url,
    onReplace,
    onClear,
    disabled,
}: {
    url: string;
    onReplace: () => void;
    onClear: () => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={url}
                alt="Current image"
                className="h-16 w-16 rounded-lg object-cover border border-border shrink-0"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                }}
            />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">Current image</p>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-muted-foreground hover:text-foreground underline truncate block"
                    title={url}
                >
                    {url}
                </a>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                    Drop a new image to regenerate every size, or click Replace.
                </p>
            </div>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={onReplace}
                    disabled={disabled}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                >
                    <RefreshCw className="h-3 w-3 inline mr-1" />
                    Replace
                </button>
                <button
                    type="button"
                    onClick={onClear}
                    disabled={disabled}
                    className="rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive p-1.5 disabled:opacity-50"
                    title="Clear"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

function SourceHeader({
    file,
    renaming,
    renameDraft,
    onRenameStart,
    onRenameCommit,
    onRenameCancel,
    onRenameDraftChange,
    onReplace,
    onClear,
    disabled,
}: {
    file: StudioSourceFile;
    renaming: boolean;
    renameDraft: string;
    onRenameStart: () => void;
    onRenameCommit: () => void;
    onRenameCancel: () => void;
    onRenameDraftChange: (next: string) => void;
    onReplace: () => void;
    onClear: () => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={file.objectUrl}
                alt={file.originalName}
                className="h-14 w-14 rounded-lg object-cover border border-border shrink-0"
            />
            <div className="min-w-0 flex-1">
                {renaming ? (
                    <div className="flex items-center gap-1">
                        <input
                            autoFocus
                            type="text"
                            value={renameDraft}
                            onChange={(e) => onRenameDraftChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") onRenameCommit();
                                if (e.key === "Escape") onRenameCancel();
                            }}
                            placeholder="my-clean-filename"
                            className="h-7 flex-1 text-sm font-mono rounded-md border border-border bg-background px-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                            type="button"
                            onClick={onRenameCommit}
                            className="text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-2 py-1"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={onRenameCancel}
                            className="text-xs rounded-md hover:bg-muted px-2 py-1 text-muted-foreground"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <p
                            className="font-mono text-sm truncate"
                            title={file.filenameBase}
                        >
                            {file.filenameBase}
                        </p>
                        <button
                            type="button"
                            onClick={onRenameStart}
                            disabled={disabled}
                            className="h-5 w-5 rounded hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-50"
                            title="Rename — variants will inherit this slug"
                        >
                            <Edit3 className="h-3 w-3" />
                        </button>
                    </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {file.originalName} · {formatDimensions(file.width, file.height)} ·{" "}
                    {formatBytes(file.size)}
                </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button
                    type="button"
                    onClick={onReplace}
                    disabled={disabled}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    title="Replace with a different image"
                >
                    <RefreshCw className="h-3 w-3 inline mr-1" />
                    Replace
                </button>
                <button
                    type="button"
                    onClick={onClear}
                    disabled={disabled}
                    className="rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive p-1.5 disabled:opacity-50"
                    title="Clear"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

function ReadyToGenerateBar({
    onGenerate,
    presetCount,
    disabled,
}: {
    onGenerate: () => void;
    presetCount: number;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
            <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Wand2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Ready to generate</p>
                <p className="text-xs text-muted-foreground">
                    {presetCount} preset{presetCount === 1 ? "" : "s"} will be created
                    and uploaded with permanent CDN URLs.
                </p>
            </div>
            <button
                type="button"
                onClick={onGenerate}
                disabled={disabled}
                className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
            >
                <Zap className="h-3 w-3" />
                Generate &amp; save
            </button>
        </div>
    );
}

function PipelineStatusBar({
    icon,
    label,
    description,
    success = false,
}: {
    icon: React.ReactNode;
    label: string;
    description: string;
    success?: boolean;
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                success
                    ? "border-success/40 bg-success/5"
                    : "border-border bg-muted/20",
            )}
        >
            <div
                className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    success ? "bg-success/15 text-success" : "bg-primary/10 text-primary",
                )}
            >
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

function VariantGrid({
    file,
    presetIds,
    primaryPresetId,
    pipelineState,
}: {
    file: StudioSourceFile;
    presetIds: string[];
    primaryPresetId: string | undefined;
    pipelineState: string;
}) {
    if (presetIds.length === 0) return null;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presetIds.map((presetId) => {
                const preset = getPresetById(presetId);
                const variant = file.variants[presetId];
                const isPrimary = presetId === primaryPresetId;
                return (
                    <VariantCard
                        key={presetId}
                        presetId={presetId}
                        presetName={preset?.name ?? presetId}
                        presetUsage={preset?.usage}
                        width={variant?.width ?? preset?.width ?? 0}
                        height={variant?.height ?? preset?.height ?? 0}
                        previewSrc={variant?.dataUrl}
                        publicUrl={variant?.publicUrl ?? null}
                        size={variant?.size ?? null}
                        compressionRatio={variant?.compressionRatio ?? null}
                        savedAt={variant?.savedAt ?? null}
                        pending={
                            !variant &&
                            (pipelineState === "generating" ||
                                pipelineState === "saving")
                        }
                        isPrimary={isPrimary}
                    />
                );
            })}
        </div>
    );
}

function VariantCard({
    presetId,
    presetName,
    presetUsage,
    width,
    height,
    previewSrc,
    publicUrl,
    size,
    compressionRatio,
    savedAt,
    pending,
    isPrimary,
}: {
    presetId: string;
    presetName: string;
    presetUsage?: string;
    width: number;
    height: number;
    previewSrc?: string;
    publicUrl: string | null;
    size: number | null;
    compressionRatio: number | null;
    savedAt: string | null;
    pending: boolean;
    isPrimary: boolean;
}) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        if (!publicUrl) return;
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* no-op */
        }
    };

    const aspect = width > 0 && height > 0 ? `${width} / ${height}` : "1 / 1";
    const saved = Boolean(savedAt && publicUrl);

    return (
        <div
            className={cn(
                "flex flex-col rounded-xl border bg-card overflow-hidden transition-all",
                isPrimary
                    ? "border-primary ring-1 ring-primary/20"
                    : "border-border",
            )}
        >
            <div
                className="relative bg-muted/40 flex items-center justify-center border-b border-border"
                style={{ aspectRatio: aspect }}
            >
                {previewSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={previewSrc}
                        alt={presetName}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                    />
                ) : pending ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                )}
                {isPrimary && (
                    <div className="absolute top-1 left-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                        Primary
                    </div>
                )}
                {saved && (
                    <div className="absolute top-1 right-1 rounded-full bg-success/15 border border-success/30 text-success px-1.5 py-0.5 text-[9px] font-semibold flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        CDN
                    </div>
                )}
            </div>
            <div className="p-2 text-xs space-y-1">
                <div className="flex items-baseline justify-between gap-1">
                    <p className="font-medium truncate" title={presetName}>
                        {presetName}
                    </p>
                    <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDimensions(width, height)}
                    </span>
                </div>
                {presetUsage && (
                    <p
                        className="text-[10px] text-muted-foreground line-clamp-2 leading-snug"
                        title={presetUsage}
                    >
                        {presetUsage}
                    </p>
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    {size != null ? (
                        <span className="font-mono">{formatBytes(size)}</span>
                    ) : (
                        <span>—</span>
                    )}
                    {compressionRatio != null && compressionRatio > 0 && (
                        <span className="text-success font-medium flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5" />
                            −{compressionRatio}%
                        </span>
                    )}
                </div>

                {publicUrl ? (
                    <div className="flex items-center gap-1 pt-1">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors",
                                copied
                                    ? "border-success/40 bg-success/10 text-success"
                                    : "border-border hover:bg-muted/40",
                            )}
                            title="Copy permanent CDN URL"
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="h-2.5 w-2.5" />
                                    Copy CDN
                                </>
                            )}
                        </button>
                        <a
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md border border-border hover:bg-muted/40 p-1 text-muted-foreground"
                            title="Open public URL in a new tab"
                        >
                            <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                    </div>
                ) : pending ? (
                    <p className="text-[10px] text-muted-foreground italic">
                        Processing…
                    </p>
                ) : (
                    <p className="text-[10px] text-muted-foreground italic">
                        URL appears after save.
                    </p>
                )}
            </div>
        </div>
    );
}

// Re-export the position type so callers building bespoke UIs stay typed.
export type { ImagePosition };
