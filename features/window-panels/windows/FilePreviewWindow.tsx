"use client";

/**
 * FilePreviewWindow — smart file previewer that resolves URLs, detects types,
 * and renders the appropriate preview inside a floating WindowPanel.
 *
 * Accepts either:
 *   { bucket, storagePath }   — resolves URL internally via FileSystemManager
 *   { url, mimeType }         — direct URL preview for external files
 *
 * Exports:
 *   FilePreviewWindow   — WindowPanel wrapper (instanced, multiple can coexist)
 *   openFilePreview     — Redux dispatch helper for OverlayController instances
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Download,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Trash2,
  Info,
  Loader2,
  AlertCircle,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowPanel } from "../WindowPanel";
import FileSystemManager from "@/utils/file-operations/FileSystemManager";
import {
  getFileDetailsByUrl,
  type EnhancedFileDetails,
} from "@/utils/file-operations/constants";
import type { StorageMetadata } from "@/utils/file-operations/types";
import {
  fetchWithUrlRefresh,
  createUrlMetadata,
} from "@/utils/file-operations/urlRefreshUtils";
import { toast } from "sonner";

import type { AvailableBuckets } from "@/lib/redux/fileSystem/types";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import type { AppDispatch } from "@/lib/redux/store";

// Dynamic imports for preview components (avoid SSR issues)
const ImagePreview = dynamic(
  () => import("@/components/ui/file-preview/previews/ImagePreview"),
  { ssr: false },
);
const VideoPreview = dynamic(
  () => import("@/components/ui/file-preview/previews/VideoPreview"),
  { ssr: false },
);
const AudioPreview = dynamic(
  () => import("@/components/ui/file-preview/previews/AudioPreview"),
  { ssr: false },
);
const PDFPreview = dynamic(
  () => import("@/components/ui/file-preview/previews/PDFPreview"),
  { ssr: false },
);
const CodePreview = dynamic(
  () => import("@/components/ui/file-preview/previews/CodePreview"),
  { ssr: false },
);
const DataPreview = dynamic(
  () => import("@/components/ui/file-preview/previews/DataPreview"),
  { ssr: false },
);
const TextPreview = dynamic(
  () => import("@/components/ui/file-preview/previews/TextPreview"),
  { ssr: false },
);
const GenericPreview = dynamic(
  () => import("@/components/ui/file-preview/previews/GenericPreview"),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilePreviewPayload {
  /** Supabase storage bucket name — if provided, URL is resolved internally */
  bucket?: AvailableBuckets;
  /** Storage path within the bucket */
  storagePath?: string;
  /** Direct URL — for external files or already-resolved URLs */
  url?: string;
  /** MIME type hint — optional, will be detected if not provided */
  mimeType?: string;
  /** Display name */
  fileName?: string;
  /** File extension */
  extension?: string;
  /** File size in bytes */
  size?: number;
  /** Unique instance id for multi-window support */
  instanceId?: string;
}

export interface FilePreviewWindowProps {
  isOpen: boolean;
  onClose: () => void;
  data: FilePreviewPayload;
  instanceId?: string;
}

// ─── Preview renderer ─────────────────────────────────────────────────────────

function renderPreview(
  fileUrl: string,
  fileBlob: Blob | null,
  details: EnhancedFileDetails | null,
  mimeType: string,
  isLoading: boolean,
  error: string | null,
) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground">Loading preview…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive mb-1">
            Failed to load file
          </p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const category = details?.category || "UNKNOWN";
  const extension = details?.extension?.toLowerCase() || "";
  const previewProps = {
    file: { url: fileUrl, type: mimeType, blob: fileBlob, details },
    isLoading: false,
  };

  switch (category) {
    case "IMAGE":
      return <ImagePreview {...previewProps} />;
    case "VIDEO":
      return <VideoPreview {...previewProps} />;
    case "AUDIO":
      return <AudioPreview {...previewProps} />;
    case "DOCUMENT":
      if (extension === "pdf") return <PDFPreview {...previewProps} />;
      if (["xlsx", "xls"].includes(extension))
        return <DataPreview {...previewProps} />;
      if (extension === "txt" || details?.subCategory === "TEXT")
        return <TextPreview {...previewProps} />;
      return <GenericPreview {...previewProps} />;
    case "CODE":
      return <CodePreview {...previewProps} />;
    case "DATA":
      if (["json", "csv", "xlsx", "xls"].includes(extension))
        return <DataPreview {...previewProps} />;
      return <GenericPreview {...previewProps} />;
    default:
      return <GenericPreview {...previewProps} />;
  }
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolBtn({
  onClick,
  label,
  disabled,
  destructive,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "p-1.5 rounded-md transition-colors disabled:opacity-30",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ─── FilePreviewWindow ────────────────────────────────────────────────────────

export function FilePreviewWindow({
  isOpen,
  onClose,
  data,
  instanceId = "default",
}: FilePreviewWindowProps) {
  const [fileUrl, setFileUrl] = useState("");
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const { bucket, storagePath, url, mimeType, fileName, extension, size } =
    data;

  // Compute file details once URL is available
  const details = useMemo<EnhancedFileDetails | null>(() => {
    if (!fileUrl) return null;
    return getFileDetailsByUrl(
      fileUrl,
      { mimetype: mimeType, size } as unknown as StorageMetadata,
      undefined,
    );
  }, [fileUrl, mimeType, size]);

  const displayName =
    fileName ||
    (storagePath ? storagePath.split("/").pop() : undefined) ||
    "File Preview";

  // ── Resolve URL ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const resolve = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let resolvedUrl = url || "";

        // If we have bucket + storagePath, resolve via FileSystemManager
        if (bucket && storagePath && !url) {
          const fsm = FileSystemManager.getInstance();
          const result = await fsm.getFileUrl(bucket, storagePath, {
            expiresIn: 3600,
          });
          resolvedUrl = result.url;
        }

        if (!resolvedUrl) {
          throw new Error("No URL could be resolved for this file.");
        }

        if (cancelled) return;
        setFileUrl(resolvedUrl);

        // Fetch the blob for download support + preview components that need it
        try {
          const urlMeta = createUrlMetadata(
            resolvedUrl,
            bucket,
            storagePath,
            undefined,
            undefined,
          );
          const result = await fetchWithUrlRefresh(urlMeta, {
            expiresIn: 3600,
            maxRetries: 2,
          });
          if (!cancelled) {
            setFileBlob(result.blob);
            if (result.refreshed) setFileUrl(result.url);
          }
        } catch {
          // Blob fetch failed — preview may still work via src URL
        }

        if (!cancelled) setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load file");
          setIsLoading(false);
        }
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [isOpen, bucket, storagePath, url]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    if (!fileBlob && !fileUrl) return;
    const downloadUrl = fileBlob ? URL.createObjectURL(fileBlob) : fileUrl;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = displayName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (fileBlob) URL.revokeObjectURL(downloadUrl);
  }, [fileBlob, fileUrl, displayName]);

  const handleCopyLink = useCallback(async () => {
    if (!fileUrl) return;
    try {
      // Get a fresh URL for sharing
      let shareUrl = fileUrl;
      if (bucket && storagePath) {
        const fsm = FileSystemManager.getInstance();
        const result = await fsm.getFileUrl(bucket, storagePath, {
          expiresIn: 3600,
        });
        shareUrl = result.url;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [fileUrl, bucket, storagePath]);

  const handleOpenExternal = useCallback(() => {
    if (fileUrl) window.open(fileUrl, "_blank");
  }, [fileUrl]);

  const handleDuplicate = useCallback(async () => {
    if (!bucket || !storagePath) return;
    try {
      const fsm = FileSystemManager.getInstance();
      const parts = storagePath.split("/");
      const name = parts.pop() || "";
      const ext = name.includes(".") ? name.split(".").pop() : "";
      const base = name.includes(".")
        ? name.substring(0, name.lastIndexOf("."))
        : name;
      const newName = ext ? `${base}_copy.${ext}` : `${base}_copy`;
      const newPath = [...parts, newName].join("/");
      const ok = await fsm.copyFile(bucket, storagePath, newPath);
      if (ok) toast.success("File duplicated");
      else throw new Error("Copy failed");
    } catch {
      toast.error("Failed to duplicate file");
    }
  }, [bucket, storagePath]);

  const handleDelete = useCallback(async () => {
    if (!bucket || !storagePath) return;
    if (!window.confirm(`Delete "${displayName}"?`)) return;
    try {
      const fsm = FileSystemManager.getInstance();
      const ok = await fsm.deleteFile(bucket, storagePath);
      if (ok) {
        toast.success("File deleted");
        onClose();
      } else {
        throw new Error("Delete failed");
      }
    } catch {
      toast.error("Failed to delete file");
    }
  }, [bucket, storagePath, displayName, onClose]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const resolvedMime = mimeType || details?.mimetype || "";

  const footer = (
    <>
      <div className="flex items-center gap-0.5">
        <ToolBtn
          onClick={handleDownload}
          label="Download"
          disabled={!fileBlob && !fileUrl}
        >
          <Download className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={handleCopyLink} label="Copy link" disabled={!fileUrl}>
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={handleOpenExternal}
          label="Open in new tab"
          disabled={!fileUrl}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-4 bg-border mx-0.5" />
        <ToolBtn
          onClick={handleDuplicate}
          label="Duplicate"
          disabled={!bucket || !storagePath}
        >
          <Copy className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={handleDelete}
          label="Delete"
          disabled={!bucket || !storagePath}
          destructive
        >
          <Trash2 className="w-3.5 h-3.5" />
        </ToolBtn>
      </div>
      <div className="flex items-center gap-2">
        {details?.size && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatSize(details.size)}
          </span>
        )}
        {size && !details?.size && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {formatSize(size)}
          </span>
        )}
        <ToolBtn onClick={() => setShowInfo((v) => !v)} label="File info">
          <Info className={cn("w-3.5 h-3.5", showInfo && "text-primary")} />
        </ToolBtn>
      </div>
    </>
  );

  return (
    <WindowPanel
      id={`file-preview-${instanceId}`}
      title={displayName}
      onClose={onClose}
      minWidth={340}
      minHeight={260}
      width={650}
      height={480}
      overlayId="filePreviewWindow"
      onCollectData={() => ({
        bucket: bucket ?? null,
        path: storagePath ?? null,
        url: fileUrl || null,
      })}
      footerLeft={
        <div className="flex items-center gap-0.5">
          <ToolBtn
            onClick={handleDownload}
            label="Download"
            disabled={!fileBlob && !fileUrl}
          >
            <Download className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={handleCopyLink}
            label="Copy link"
            disabled={!fileUrl}
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={handleOpenExternal}
            label="Open in new tab"
            disabled={!fileUrl}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </ToolBtn>
          <div className="w-px h-4 bg-border mx-0.5" />
          <ToolBtn
            onClick={handleDuplicate}
            label="Duplicate"
            disabled={!bucket || !storagePath}
          >
            <Copy className="w-3.5 h-3.5" />
          </ToolBtn>
          <ToolBtn
            onClick={handleDelete}
            label="Delete"
            disabled={!bucket || !storagePath}
            destructive
          >
            <Trash2 className="w-3.5 h-3.5" />
          </ToolBtn>
        </div>
      }
      footerRight={
        <div className="flex items-center gap-2">
          {(details?.size || size) && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {formatSize((details?.size || size)!)}
            </span>
          )}
          <ToolBtn onClick={() => setShowInfo((v) => !v)} label="File info">
            <Info className={cn("w-3.5 h-3.5", showInfo && "text-primary")} />
          </ToolBtn>
        </div>
      }
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Preview area */}
        <div className="flex-1 min-h-0 overflow-auto">
          {renderPreview(
            fileUrl,
            fileBlob,
            details,
            resolvedMime,
            isLoading,
            error,
          )}
        </div>

        {/* Info panel — collapses below preview */}
        {showInfo && details && (
          <div className="shrink-0 border-t border-border bg-muted/30 px-3 py-2">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11px]">
              {details.category && (
                <>
                  <span className="text-muted-foreground">Type</span>
                  <span>{details.subCategory || details.category}</span>
                </>
              )}
              {resolvedMime && (
                <>
                  <span className="text-muted-foreground">MIME</span>
                  <span className="truncate">{resolvedMime}</span>
                </>
              )}
              {(details.size || size) && (
                <>
                  <span className="text-muted-foreground">Size</span>
                  <span>{formatSize((details.size || size)!)}</span>
                </>
              )}
              {extension && (
                <>
                  <span className="text-muted-foreground">Extension</span>
                  <span>.{extension}</span>
                </>
              )}
              {storagePath && (
                <>
                  <span className="text-muted-foreground">Path</span>
                  <span className="truncate">{storagePath}</span>
                </>
              )}
              {bucket && (
                <>
                  <span className="text-muted-foreground">Bucket</span>
                  <span>{bucket}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </WindowPanel>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Redux dispatch helper ────────────────────────────────────────────────────

export function openFilePreview(
  dispatch: AppDispatch,
  payload: FilePreviewPayload,
) {
  const instanceId =
    payload.instanceId ??
    `preview-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  dispatch(
    openOverlay({
      overlayId: "filePreviewWindow",
      instanceId,
      data: {
        bucket: payload.bucket,
        storagePath: payload.storagePath,
        url: payload.url,
        mimeType: payload.mimeType,
        fileName: payload.fileName,
        extension: payload.extension,
        size: payload.size,
      },
    }),
  );
}
