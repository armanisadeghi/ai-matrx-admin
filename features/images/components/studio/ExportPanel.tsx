"use client";

import React, { useState } from "react";
import {
  CloudUpload,
  Eye,
  FolderInput,
  Gauge,
  Paintbrush,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ImageFit, ImagePosition, OutputFormat } from "@/features/images/studio-types";
import { CropControls } from "./CropControls";

const FORMATS: Array<{
  id: OutputFormat;
  label: string;
  blurb: string;
  supportsAlpha: boolean;
}> = [
  {
    id: "webp",
    label: "WebP",
    blurb: "Best balance — ~30% smaller than JPEG, alpha supported",
    supportsAlpha: true,
  },
  {
    id: "avif",
    label: "AVIF",
    blurb: "Smallest files, slightly slower to decode",
    supportsAlpha: false,
  },
  {
    id: "jpeg",
    label: "JPEG",
    blurb: "Universal support, no alpha",
    supportsAlpha: false,
  },
  {
    id: "png",
    label: "PNG",
    blurb: "Lossless, best for logos/icons, alpha",
    supportsAlpha: true,
  },
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
  isSaving: boolean;
  canSave: boolean;
  onSaveAll: (folder: string, makePublic: boolean) => void;
  onOpenPreview?: () => void;
  canOpenPreview?: boolean;
  isPreviewOpen?: boolean;
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
  isSaving,
  canSave,
  onSaveAll,
  onOpenPreview,
  canOpenPreview = false,
  isPreviewOpen = false,
}: ExportPanelProps) {
  const [folder, setFolder] = useState("image-studio");
  const [makePublic, setMakePublic] = useState(false);

  return (
    <aside className="flex flex-col h-full min-h-0 border-l border-border bg-card/50">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          Output settings
        </h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-5">
        {/* Crop & fit */}
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
            {isPreviewOpen ? "Preview open — focus it" : "Open live crop preview"}
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
            Presets that specify their own format (favicons → PNG, avatars →
            WebP) keep their defaults.
          </p>
        </div>

        {/* Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              Quality
            </label>
            <span className="font-mono text-xs tabular-nums">{quality}%</span>
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
            JPEG/AVIF don't support alpha. Transparent pixels are filled with
            this colour when converting.
          </p>
        </div>

        <div className="h-px bg-border" />

        {/* Save to library */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
            <FolderInput className="h-3 w-3" />
            Save to library — folder
          </label>
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="w-full h-8 rounded-md border border-border bg-background px-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="image-studio"
          />
          <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
            <Checkbox
              checked={makePublic}
              onCheckedChange={(v) => setMakePublic(v === true)}
              className="mt-0.5 shrink-0"
            />
            <span className="min-w-0 leading-snug">
              <span className="font-medium">Make publicly viewable</span>
              <span className="block text-[10px] text-muted-foreground">
                Returns permanent CDN URLs anyone can load.
              </span>
            </span>
          </label>
          <button
            type="button"
            onClick={() => onSaveAll(folder, makePublic)}
            disabled={!canSave || isSaving}
            className={cn(
              "w-full h-9 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
              canSave && !isSaving
                ? "bg-success/10 border border-success/40 text-success hover:bg-success/20"
                : "bg-muted text-muted-foreground border border-border cursor-not-allowed",
            )}
          >
            <CloudUpload className="h-3.5 w-3.5" />
            {isSaving
              ? "Saving…"
              : makePublic
                ? "Save all (public)"
                : "Save all (private)"}
          </button>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Uploads every generated variant under{" "}
            <code className="font-mono">
              Images/Generated/{folder || "image-studio"}
            </code>
            .
          </p>
        </div>
      </div>
    </aside>
  );
}
