"use client";

import React from "react";
import { Download, FileDown, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/features/images/utils/format-bytes";

interface StudioActionBarProps {
  filesCount: number;
  selectedPresetCount: number;
  totalVariantCount: number;
  generatedVariantCount: number;
  totalOutputBytes: number;
  selectedVariantCount: number;
  isProcessing: boolean;
  canGenerate: boolean;
  canDownload: boolean;
  onGenerate: () => void;
  onDownloadAll: () => void;
  onDownloadSelected: () => void;
  onDescribeAll?: () => void;
  isDescribing?: boolean;
  describedFileCount?: number;
}

export function StudioActionBar({
  filesCount,
  selectedPresetCount,
  totalVariantCount,
  generatedVariantCount,
  totalOutputBytes,
  selectedVariantCount,
  isProcessing,
  canGenerate,
  canDownload,
  onGenerate,
  onDownloadAll,
  onDownloadSelected,
  onDescribeAll,
  isDescribing = false,
  describedFileCount = 0,
}: StudioActionBarProps) {
  return (
    <div className="shrink-0 border-t border-border bg-card/95 px-4 h-12 flex items-center gap-3">
      {/* Live stats */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1 min-w-0 overflow-hidden">
        <span className="tabular-nums shrink-0">
          <span className="font-medium text-foreground">{filesCount}</span>{" "}
          {filesCount === 1 ? "file" : "files"}
        </span>
        {selectedPresetCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span className="tabular-nums shrink-0">
              <span className="font-medium text-foreground">{selectedPresetCount}</span>{" "}
              {selectedPresetCount === 1 ? "preset" : "presets"}
            </span>
          </>
        )}
        {generatedVariantCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span className="tabular-nums shrink-0">
              <span className="font-medium text-foreground">{generatedVariantCount}</span>
              {totalVariantCount > 0 && `/${totalVariantCount}`} variants
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-success shrink-0">
              {formatBytes(totalOutputBytes)}
            </span>
          </>
        )}
      </div>

      {/* AI Describe */}
      {onDescribeAll && (
        <button
          type="button"
          onClick={onDescribeAll}
          disabled={filesCount === 0 || isDescribing}
          className={cn(
            "h-7 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0",
            filesCount > 0 && !isDescribing
              ? "border-border text-foreground hover:bg-muted/60"
              : "border-border/50 text-muted-foreground opacity-40 cursor-not-allowed",
          )}
          title="AI-describe all files — generates smart filename, alt text, and SEO copy"
        >
          {isDescribing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          {isDescribing
            ? "Describing…"
            : describedFileCount > 0 && describedFileCount === filesCount
              ? "Re-describe"
              : describedFileCount > 0
                ? `Describe (${filesCount - describedFileCount} left)`
                : "AI Describe"}
        </button>
      )}

      {/* Download selected */}
      <button
        type="button"
        onClick={onDownloadSelected}
        disabled={selectedVariantCount === 0}
        className="h-7 px-2.5 rounded-md border border-border text-xs font-medium flex items-center gap-1.5 hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        title="Download only the selected variants as a ZIP"
      >
        <FileDown className="h-3.5 w-3.5" />
        Selected{selectedVariantCount > 0 ? ` (${selectedVariantCount})` : ""}
      </button>

      {/* Download all */}
      <button
        type="button"
        onClick={onDownloadAll}
        disabled={!canDownload}
        className="h-7 px-2.5 rounded-md border border-border text-xs font-medium flex items-center gap-1.5 hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        title="Download every generated variant as a ZIP"
      >
        <Download className="h-3.5 w-3.5" />
        All{generatedVariantCount > 0 ? ` (${generatedVariantCount})` : ""}
      </button>

      {/* Generate — primary CTA */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate || isProcessing}
        className={cn(
          "h-8 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shrink-0",
          canGenerate && !isProcessing
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            : "bg-muted text-muted-foreground cursor-not-allowed",
        )}
      >
        <Zap className={cn("h-3.5 w-3.5", isProcessing && "animate-pulse")} />
        {isProcessing ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
