"use client";

import React from "react";
import { Download, FileDown, LayoutGrid, Loader2, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/features/images/utils/format-bytes";

interface ToolBtnProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  title?: string;
}

function ToolBtn({ icon: Icon, label, active, disabled, loading, onClick, title }: ToolBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "w-10 h-9 rounded-lg flex flex-col items-center justify-center gap-px transition-colors shrink-0",
        active
          ? "bg-accent text-foreground"
          : disabled
            ? "text-muted-foreground/40 cursor-not-allowed"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      <span className="text-[9px] leading-none truncate max-w-full px-0.5">{label}</span>
    </button>
  );
}

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
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
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
  leftPanelOpen,
  rightPanelOpen,
  onToggleLeftPanel,
  onToggleRightPanel,
}: StudioActionBarProps) {
  const aiDescribeLabel =
    isDescribing
      ? "…"
      : describedFileCount > 0 && describedFileCount === filesCount
        ? "Re-desc"
        : "Describe";

  const dlSelLabel = selectedVariantCount > 0 ? `Sel (${selectedVariantCount})` : "Selected";
  const dlAllLabel = generatedVariantCount > 0 ? `All (${generatedVariantCount})` : "All";

  return (
    <div className="shrink-0 h-[52px] border-t border-border bg-background/95 backdrop-blur-sm flex items-center justify-center px-4 relative">
      {/* Stats — floats left */}
      <div className="absolute left-4 hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{filesCount}</span>{" "}
          {filesCount === 1 ? "file" : "files"}
        </span>
        {selectedPresetCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span>
              <span className="font-medium text-foreground">{selectedPresetCount}</span>{" "}
              {selectedPresetCount === 1 ? "preset" : "presets"}
            </span>
          </>
        )}
        {generatedVariantCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span>
              <span className="font-medium text-foreground">{generatedVariantCount}</span>
              {totalVariantCount > 0 && `/${totalVariantCount}`} variants
            </span>
            <span className="text-border">·</span>
            <span className="font-medium text-success">{formatBytes(totalOutputBytes)}</span>
          </>
        )}
      </div>

      {/* Tool group pill — centered */}
      <div className="flex items-center gap-0.5 bg-muted border border-border rounded-[10px] p-1">
        <ToolBtn
          icon={LayoutGrid}
          label="Presets"
          active={leftPanelOpen}
          onClick={onToggleLeftPanel}
          title="Preset catalog"
        />
        <ToolBtn
          icon={Settings}
          label="Settings"
          active={rightPanelOpen}
          onClick={onToggleRightPanel}
          title="Output settings"
        />

        <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

        {onDescribeAll && (
          <ToolBtn
            icon={Zap}
            label={aiDescribeLabel}
            disabled={filesCount === 0}
            loading={isDescribing}
            onClick={onDescribeAll}
            title="AI-describe all files — generates smart filename, alt text, and SEO copy"
          />
        )}

        <ToolBtn
          icon={FileDown}
          label={dlSelLabel}
          disabled={selectedVariantCount === 0}
          onClick={onDownloadSelected}
          title="Download selected variants as ZIP"
        />

        <ToolBtn
          icon={Download}
          label={dlAllLabel}
          disabled={!canDownload}
          onClick={onDownloadAll}
          title="Download all variants as ZIP"
        />

        <div className="w-px h-5 bg-border mx-0.5 shrink-0" />

        {/* Generate — primary pill with glow */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isProcessing}
          className={cn(
            "h-9 px-4 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all shrink-0",
            canGenerate && !isProcessing
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_rgba(99,102,241,0.35)]"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          <Zap className={cn("h-3.5 w-3.5", isProcessing && "animate-pulse")} />
          {isProcessing ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
