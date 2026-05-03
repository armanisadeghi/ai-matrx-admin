"use client";

import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Crop,
  Download,
  ExternalLink,
  Loader2,
  Maximize2,
  Scaling,
  Trash2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageFit, ImagePosition, ProcessedVariant } from "../types";
import { getPresetById } from "../presets";
import { formatBytes, formatDimensions } from "../utils/format-bytes";
import { downloadSingleVariant } from "../utils/download-bundle";
import { getSignedUrl } from "@/features/files/api/files";

function fitIcon(fit: ImageFit): React.ReactNode {
  switch (fit) {
    case "cover":
      return <Crop className="h-2.5 w-2.5" />;
    case "contain":
      return <Maximize2 className="h-2.5 w-2.5" />;
    case "inside":
      return <Scaling className="h-2.5 w-2.5" />;
  }
}

function positionLabel(p: ImagePosition): string {
  if (typeof p === "object") {
    return `${(p.x * 100).toFixed(0)},${(p.y * 100).toFixed(0)}%`;
  }
  switch (p) {
    case "top-left":
      return "↖";
    case "top":
      return "↑";
    case "top-right":
      return "↗";
    case "left":
      return "←";
    case "center":
      return "●";
    case "right":
      return "→";
    case "bottom-left":
      return "↙";
    case "bottom":
      return "↓";
    case "bottom-right":
      return "↘";
    case "attention":
      return "Sm·A";
    case "entropy":
      return "Sm·E";
  }
}

interface StudioVariantTileProps {
  variant: ProcessedVariant;
  /** Whether this tile is selected for bundled actions. */
  selected: boolean;
  onToggleSelect: () => void;
}

export function StudioVariantTile({
  variant,
  selected,
  onToggleSelect,
}: StudioVariantTileProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const preset = getPresetById(variant.presetId);
  const usage = preset?.usage ?? "";
  const presetName = preset?.name ?? variant.presetId;

  /**
   * Resolve the URL we want users to actually paste. Priority:
   *   1. Permanent CDN URL — set on save when visibility=public.
   *      This is a Cloudflare-fronted, checksum-versioned URL that never
   *      expires. ALWAYS prefer this.
   *   2. Signed URL — for private saved variants, lazy-fetch from the API
   *      (good for ~1h). Better than nothing, never as good as #1.
   *   3. Data URL — base64 in-memory bytes. ONLY for variants that haven't
   *      been saved yet. We never copy this to the clipboard for saved
   *      variants because pasting a 2MB string into chat/HTML is a disaster.
   */
  const resolveCopyableUrl = async (): Promise<string> => {
    if (variant.publicUrl) return variant.publicUrl;
    if (variant.fileId) {
      const { data } = await getSignedUrl(variant.fileId, { expiresIn: 3600 });
      return data.url;
    }
    return variant.dataUrl;
  };

  const handleCopyUrl = async () => {
    setCopyError(null);
    try {
      const url = await resolveCopyableUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setCopyError(err instanceof Error ? err.message : "Copy failed");
      setTimeout(() => setCopyError(null), 2500);
    }
  };

  const handleDownload = () => {
    // Local download — always uses the in-memory bytes for instant save,
    // since the user already has them and a network round-trip would be
    // pointless here.
    downloadSingleVariant(variant.dataUrl, variant.filename);
  };

  // The "open in new tab" link prefers the CDN URL. For private saved
  // variants we fall back to opening the Cloud Files file page (which
  // resolves to a signed URL inside). For unsaved variants the link is
  // hidden entirely.
  const externalHref = variant.publicUrl
    ? variant.publicUrl
    : variant.fileId
      ? `/files/f/${variant.fileId}`
      : null;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card transition-all overflow-hidden",
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-sm"
          : "border-border hover:border-primary/40",
      )}
    >
      {/* Selection checkbox */}
      <button
        type="button"
        onClick={onToggleSelect}
        className={cn(
          "absolute top-2 left-2 z-10 h-5 w-5 rounded-md border transition-all flex items-center justify-center",
          selected
            ? "bg-primary border-primary text-primary-foreground"
            : "bg-background/80 backdrop-blur border-border opacity-0 group-hover:opacity-100",
        )}
        aria-label={selected ? "Deselect variant" : "Select variant"}
      >
        {selected && <Check className="h-3 w-3" />}
      </button>

      {/* Saved indicator */}
      {variant.savedAt && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-success/10 border border-success/30 px-2 py-0.5 text-[10px] font-medium text-success">
          <CheckCircle2 className="h-3 w-3" />
          Saved
        </div>
      )}

      {/* Preview */}
      <div
        className="relative bg-muted/40 flex items-center justify-center border-b border-border overflow-hidden"
        style={{ aspectRatio: `${variant.width} / ${variant.height}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={variant.dataUrl}
          alt={presetName}
          className="max-h-full max-w-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1 p-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-sm truncate" title={presetName}>
            {presetName}
          </p>
          <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
            {formatDimensions(variant.width, variant.height)}
          </span>
        </div>
        <p
          className="text-[11px] text-muted-foreground line-clamp-2 leading-snug"
          title={usage}
        >
          {usage}
        </p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
              {variant.format}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatBytes(variant.size)}
            </span>
            <span
              className="flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize"
              title={
                variant.fit === "cover"
                  ? `Cover — anchored to ${variant.position ?? "center"}`
                  : variant.fit === "contain"
                    ? "Contain — padded with background colour"
                    : "Inside — shrunk to fit without crop or padding"
              }
            >
              {fitIcon(variant.fit)}
              {variant.fit}
              {variant.fit === "cover" && variant.position && (
                <span className="font-mono ml-0.5 text-muted-foreground">
                  {positionLabel(variant.position)}
                </span>
              )}
            </span>
          </div>
          {variant.compressionRatio != null && variant.compressionRatio > 0 && (
            <span
              className="flex items-center gap-0.5 text-[10px] text-success font-medium"
              title={`${variant.compressionRatio}% smaller than the original source`}
            >
              <Zap className="h-2.5 w-2.5" />−{variant.compressionRatio}%
            </span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex border-t border-border bg-muted/20">
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Download this variant"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
        <div className="w-px bg-border" />
        <button
          type="button"
          onClick={handleCopyUrl}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title={
            variant.publicUrl
              ? "Copy permanent CDN URL"
              : variant.fileId
                ? "Copy a fresh signed URL (≈1h)"
                : "Save first to get a sharable URL — copies the data URL otherwise"
          }
        >
          {copyError ? (
            <span className="text-destructive truncate max-w-[120px]">
              {copyError}
            </span>
          ) : copied ? (
            <>
              <Check className="h-3 w-3 text-success" />
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              {variant.publicUrl
                ? "Copy CDN"
                : variant.fileId
                  ? "Copy URL"
                  : "Copy URL"}
            </>
          )}
        </button>
        {externalHref && (
          <>
            <div className="w-px bg-border" />
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title={
                variant.publicUrl
                  ? "Open the CDN URL in a new tab"
                  : "Open in Cloud Files"
              }
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export function StudioVariantTilePending({ presetId }: { presetId: string }) {
  const preset = getPresetById(presetId);
  return (
    <div className="relative flex flex-col rounded-xl border border-dashed border-border bg-muted/20 overflow-hidden">
      <div
        className="relative flex items-center justify-center bg-muted/40"
        style={{
          aspectRatio: `${preset?.width ?? 1} / ${preset?.height ?? 1}`,
        }}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
      <div className="p-2.5 text-xs">
        <p className="font-medium text-sm truncate">
          {preset?.name ?? presetId}
        </p>
        <p className="text-[11px] text-muted-foreground">Processing…</p>
      </div>
    </div>
  );
}

export function StudioVariantTileError({
  presetId,
  error,
  onRetry,
}: {
  presetId: string;
  error: string;
  onRetry?: () => void;
}) {
  const preset = getPresetById(presetId);
  return (
    <div className="relative flex flex-col rounded-xl border border-destructive/40 bg-destructive/5 overflow-hidden">
      <div className="p-3 text-xs">
        <p className="font-medium text-sm truncate">
          {preset?.name ?? presetId}
        </p>
        <p className="text-[11px] text-destructive mt-1">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-[10px] underline text-destructive hover:text-destructive/80"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

/** Helper that many variant tiles can be shown with a small "bare" preview. */
interface VariantTileProps {
  children: React.ReactNode;
}
export function VariantTileGrid({ children }: VariantTileProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {children}
    </div>
  );
}
