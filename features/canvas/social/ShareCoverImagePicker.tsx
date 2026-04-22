"use client";

/**
 * ShareCoverImagePicker
 *
 * Compact cover-image picker for the CanvasShareSheet. Lets the user:
 *   1. Pick one of the curated PRESET_COVERS
 *   2. Upload their own image (stored in the user-public-assets bucket)
 *   3. Remove the currently selected cover
 *
 * The selected URL is an absolute public HTTPS URL suitable for use as an
 * Open Graph image on shared-canvas pages.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  ImageIcon,
  Upload,
  X,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useFileUploadWithStorage } from "@/components/ui/file-upload/useFileUploadWithStorage";
import { PRESET_COVERS } from "./preset-covers";
import { cn } from "@/utils/cn";

interface ShareCoverImagePickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

type ViewMode = "idle" | "gallery";

const ACCEPT_IMAGE = ".jpg,.jpeg,.png,.webp,.gif";
const MAX_SIZE_MB = 8;

export function ShareCoverImagePicker({
  value,
  onChange,
  disabled,
}: ShareCoverImagePickerProps) {
  const [view, setView] = useState<ViewMode>("idle");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // NOTE: `uploadToPublicUserAssets` uploads straight to the user's own
  // public-assets dir — the constructor args below are unused by that method
  // but the hook requires them.
  const { uploadToPublicUserAssets } =
    useFileUploadWithStorage("user-public-assets");

  const handleFileSelected = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploadError(`Image must be under ${MAX_SIZE_MB}MB`);
        return;
      }

      setUploadError(null);
      setUploading(true);
      try {
        // Prefix filename so re-uploads don't collide and covers are easy
        // to find inside the user's public bucket.
        const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
        const safeExt = ext.replace(/[^a-z0-9]/g, "") || "png";
        const renamed = new File(
          [file],
          `canvas-cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`,
          { type: file.type },
        );
        const result = await uploadToPublicUserAssets(renamed);
        if (result?.url) {
          onChange(result.url);
          setView("idle");
        } else {
          setUploadError("Upload failed. Please try again.");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadError(msg);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange, uploadToPublicUserAssets],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled || uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFileSelected(file);
    },
    [disabled, uploading, handleFileSelected],
  );

  const triggerUpload = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const clearCover = () => {
    onChange(null);
    setUploadError(null);
  };

  const presetForCurrent = value
    ? PRESET_COVERS.find((c) => c.ogUrl === value)
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
          Cover Image
          <span className="text-xs font-normal text-muted-foreground">
            — shown on social share previews
          </span>
        </Label>
        {value && !uploading && (
          <button
            type="button"
            onClick={clearCover}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_IMAGE}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFileSelected(f);
        }}
      />

      {/* ── PREVIEW + ACTIONS (default view) ───────────────────────────── */}
      {view === "idle" && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={value ? undefined : triggerUpload}
            className={cn(
              "relative aspect-[1200/630] w-full overflow-hidden rounded-lg border transition-colors",
              value
                ? "border-border"
                : "border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer",
              (disabled || uploading) && "pointer-events-none opacity-60",
            )}
          >
            {value ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt="Cover preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {presetForCurrent && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur text-xs font-medium border border-border">
                    {presetForCurrent.label}
                  </div>
                )}
              </>
            ) : uploading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs">Uploading…</span>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                <ImageIcon className="w-7 h-7" />
                <span className="text-xs font-medium">
                  No cover image — using default
                </span>
                <span className="text-[11px] opacity-70">
                  Click to upload, or pick from the gallery below
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView("gallery")}
              disabled={disabled || uploading}
              className="flex-1"
            >
              <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
              Gallery
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerUpload}
              disabled={disabled || uploading}
              className="flex-1"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 mr-1.5" />
              )}
              Upload
            </Button>
          </div>
        </>
      )}

      {/* ── GALLERY VIEW ──────────────────────────────────────────────── */}
      {view === "gallery" && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {PRESET_COVERS.map((cover) => {
              const isSelected = value === cover.ogUrl;
              return (
                <button
                  key={cover.id}
                  type="button"
                  onClick={() => {
                    onChange(cover.ogUrl);
                    setView("idle");
                  }}
                  disabled={disabled}
                  className={cn(
                    "relative aspect-[1200/630] overflow-hidden rounded-md border-2 transition-all group",
                    isSelected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-primary/40",
                  )}
                  title={cover.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover.thumbUrl}
                    alt={cover.label}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pt-3 pb-1">
                    <span className="text-[10px] font-medium text-white leading-none">
                      {cover.label}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("idle")}
            className="w-full"
          >
            Back
          </Button>
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {uploadError}
        </p>
      )}
    </div>
  );
}
