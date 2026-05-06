/**
 * components/image/cloud/CloudImagesTab.tsx
 *
 * Live image gallery sourced from the user's cloud-files Redux slice.
 * Filters to image-MIME records, supports search, a Recents (last 30d)
 * filter, and a view-mode toggle (Cozy / Compact / List). All view-mode
 * state is persisted to `localStorage` under
 * `image-manager:cloud-images-view`.
 *
 * Selection writes `ImageSource` with `type: "cloud-file"` and stashes
 * `metadata.fileId` so downstream features can deep-link back into the
 * cloud-files surfaces (preview, share, restore version).
 *
 * Browse-mode click resolves only the *clicked* file's URL (not every
 * visible image's URL) and opens it in the floating ImageViewerWindow.
 * Resolving every image up-front was wasteful and pushed
 * `ResolvedCloudUrl` objects instead of strings into the viewer, which
 * is why the window appeared empty.
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ImageOff,
  Loader2,
  Check,
  Clock,
  Cloud,
  Info,
  LayoutGrid,
  Grid3x3,
  List as ListIcon,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectActiveUserId } from "@/lib/redux/selectors/userSelectors";
import {
  selectAllFilesArray,
  selectTreeStatus,
} from "@/features/files/redux/selectors";
import { loadUserFileTree } from "@/features/files/redux/thunks";
import { isImageMime, resolveMime } from "@/features/files/utils/file-types";
import { MediaThumbnail } from "@/features/files/components/core/MediaThumbnail/MediaThumbnail";
import type { CloudFileRecord } from "@/features/files/types";
import {
  useSelectedImages,
  type ImageSource,
} from "@/components/image/context/SelectedImagesProvider";
import {
  buildCloudImageSource,
  resolveCloudFileUrl,
} from "@/components/image/cloud/resolveCloudFileUrl";
import { ImageGrid } from "@/components/image/shared/ImageGrid";
import { useBrowseAction } from "@/features/image-manager/browse/BrowseImageProvider";
import { CloudFileMetadataSheet } from "@/features/image-manager/components/CloudFileMetadataSheet";
import { toast } from "sonner";

const RECENTS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type ViewMode = "cozy" | "compact" | "list";
const VIEW_STORAGE_KEY = "image-manager:cloud-images-view";

const VIEW_OPTIONS: { id: ViewMode; label: string; icon: LucideIcon }[] = [
  { id: "cozy", label: "Cozy grid", icon: LayoutGrid },
  { id: "compact", label: "Compact grid", icon: Grid3x3 },
  { id: "list", label: "List", icon: ListIcon },
];

function loadInitialView(): ViewMode {
  if (typeof window === "undefined") return "cozy";
  try {
    const v = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (v === "cozy" || v === "compact" || v === "list") return v;
  } catch {
    /* ignore */
  }
  return "cozy";
}

export interface CloudImagesTabProps {
  /**
   * Optional legacy URLs passed by callers that still use the
   * `userImages` prop. Rendered as a "Provided" section above the
   * cloud-files results so existing callers don't lose data.
   */
  providedUrls?: string[];
}

export function CloudImagesTab({ providedUrls }: CloudImagesTabProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const userId = useAppSelector(selectActiveUserId);
  const treeStatus = useAppSelector(selectTreeStatus);
  const allFiles = useAppSelector(selectAllFilesArray);
  const { isSelected, toggleImage, selectionMode, addImage, clearImages } =
    useSelectedImages();
  const browse = useBrowseAction();

  const [query, setQuery] = useState("");
  const [showRecentsOnly, setShowRecentsOnly] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [metadataFile, setMetadataFile] = useState<CloudFileRecord | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(loadInitialView);

  // Persist the view mode whenever it changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {
      /* ignore */
    }
  }, [viewMode]);

  // Hydrate the tree the first time the tab opens. The realtime provider
  // also fires this when mounted at the layout level, but inside a modal
  // we can't rely on that — drive it ourselves.
  useEffect(() => {
    if (!userId) return;
    if (treeStatus === "idle" || treeStatus === "error") {
      void dispatch(loadUserFileTree({ userId }));
    }
  }, [userId, treeStatus, dispatch]);

  const imageFiles = useMemo(() => {
    const cutoff = showRecentsOnly ? Date.now() - RECENTS_WINDOW_MS : 0;
    const q = query.trim().toLowerCase();
    return allFiles
      .filter((file) => {
        if (file.deletedAt) return false;
        const mime = resolveMime(file.mimeType, file.fileName);
        if (!isImageMime(mime)) return false;
        if (showRecentsOnly) {
          const ts = file.updatedAt
            ? new Date(file.updatedAt).getTime()
            : file.createdAt
              ? new Date(file.createdAt).getTime()
              : 0;
          if (ts < cutoff) return false;
        }
        if (q && !file.fileName.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const aTs = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTs = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTs - aTs;
      });
  }, [allFiles, query, showRecentsOnly]);

  const handleTileClick = async (file: CloudFileRecord) => {
    // ─── Browse mode: resolve ONLY the clicked file and open the viewer.
    //
    // Earlier this helper resolved every visible file in parallel via
    // `Promise.all(imageFiles.map(...))`, then pushed each
    // `ResolvedCloudUrl` object straight into the viewer's `images: string[]`
    // contract — so the viewer rendered `<img src="[object Object]">` and
    // also fired N signed-URL requests on every single click. Both are
    // gone: one click, one resolve, one image.
    if (selectionMode === "none") {
      try {
        setResolvingId(file.id);
        const resolved = await resolveCloudFileUrl(store, file.id);
        browse({
          images: [resolved.url],
          alts: [file.fileName],
          initialIndex: 0,
          title: file.fileName,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not load that image";
        toast.error(message);
      } finally {
        setResolvingId(null);
      }
      return;
    }

    // ─── Selection modes (single / multiple) ────────────────────────────
    const sourceId = `cloud:${file.id}`;
    if (isSelected(sourceId)) {
      toggleImage({
        type: "cloud-file",
        url: file.publicUrl ?? "",
        id: sourceId,
      } as ImageSource);
      return;
    }
    try {
      setResolvingId(file.id);
      if (selectionMode === "single") {
        clearImages();
      }
      const resolved = await resolveCloudFileUrl(store, file.id);
      addImage(buildCloudImageSource(file, resolved));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load that image";
      toast.error(message);
    } finally {
      setResolvingId(null);
    }
  };

  const isLoading = treeStatus === "loading" || treeStatus === "idle";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex flex-col">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your images..."
              className="pl-8 text-base"
              style={{ fontSize: "16px" }}
            />
          </div>
          <Button
            type="button"
            variant={showRecentsOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowRecentsOnly((v) => !v)}
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Recents
          </Button>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <div className="text-xs text-muted-foreground hidden sm:block">
            {imageFiles.length} image{imageFiles.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {providedUrls && providedUrls.length > 0 ? (
            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Provided
              </h4>
              <ImageGrid
                images={providedUrls.map((url, index) => ({
                  type: "public" as const,
                  url,
                  id: `provided-${index}-${url}`,
                  metadata: {
                    description: `External image ${index + 1}`,
                    title: `Image ${index + 1}`,
                  },
                }))}
                columns={4}
                gap="md"
                aspectRatio="1:1"
                selectable={true}
              />
            </section>
          ) : null}

          <section>
            {providedUrls && providedUrls.length > 0 ? (
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Your Cloud
              </h4>
            ) : null}

            {isLoading && allFiles.length === 0 ? (
              <CloudLoadingState />
            ) : imageFiles.length === 0 ? (
              <CloudEmptyState
                hasQuery={query.length > 0}
                hasRecents={showRecentsOnly}
              />
            ) : viewMode === "list" ? (
              <CloudFilesList
                files={imageFiles}
                resolvingId={resolvingId}
                selectionMode={selectionMode}
                isSelected={(id) => isSelected(`cloud:${id}`)}
                onTileClick={handleTileClick}
                onShowMetadata={setMetadataFile}
              />
            ) : (
              <CloudFilesGrid
                files={imageFiles}
                density={viewMode}
                resolvingId={resolvingId}
                selectionMode={selectionMode}
                isSelected={(id) => isSelected(`cloud:${id}`)}
                onTileClick={handleTileClick}
                onShowMetadata={setMetadataFile}
              />
            )}
          </section>
        </div>

        <CloudFileMetadataSheet
          file={metadataFile}
          onOpenChange={(open) => {
            if (!open) setMetadataFile(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// View-mode toggle
// ---------------------------------------------------------------------------

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-md border border-border bg-card overflow-hidden"
      role="group"
      aria-label="View mode"
    >
      {VIEW_OPTIONS.map((opt) => {
        const active = value === opt.id;
        const Icon = opt.icon;
        return (
          <Tooltip key={opt.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(opt.id)}
                aria-pressed={active}
                aria-label={opt.label}
                className={cn(
                  "h-8 w-8 flex items-center justify-center transition-colors border-r border-border last:border-r-0",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{opt.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid renderer — handles both "cozy" (default) and "compact" densities.
// ---------------------------------------------------------------------------

interface FilesViewProps {
  files: CloudFileRecord[];
  resolvingId: string | null;
  selectionMode: "single" | "multiple" | "none";
  isSelected: (fileId: string) => boolean;
  onTileClick: (file: CloudFileRecord) => void;
  onShowMetadata: (file: CloudFileRecord) => void;
}

function CloudFilesGrid({
  files,
  density,
  resolvingId,
  selectionMode,
  isSelected,
  onTileClick,
  onShowMetadata,
}: FilesViewProps & { density: "cozy" | "compact" }) {
  const gridClasses =
    density === "compact"
      ? "grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2"
      : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3";
  const iconSize = density === "compact" ? 32 : 48;
  const checkSize =
    density === "compact"
      ? "h-4 w-4 top-1 right-1"
      : "h-5 w-5 top-1.5 right-1.5";
  const infoSize =
    density === "compact" ? "h-4 w-4 top-1 left-1" : "h-5 w-5 top-1.5 left-1.5";

  return (
    <div className={gridClasses}>
      {files.map((file) => {
        const selected = isSelected(file.id);
        const resolving = resolvingId === file.id;
        const isBrowse = selectionMode === "none";
        return (
          <button
            key={file.id}
            type="button"
            onClick={() => onTileClick(file)}
            disabled={resolving}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-md border-2 transition-all bg-muted/40",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40",
              !isBrowse && selected
                ? "border-primary ring-2 ring-primary/30"
                : "border-transparent",
              resolving && "opacity-60 cursor-wait",
            )}
            title={file.fileName}
            aria-label={
              isBrowse
                ? `Open ${file.fileName}`
                : selected
                  ? `Deselect ${file.fileName}`
                  : `Select ${file.fileName}`
            }
          >
            <MediaThumbnail
              file={file}
              iconSize={iconSize}
              className="absolute inset-0"
            />
            {!isBrowse && selected ? (
              <div
                className={cn(
                  "absolute rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md",
                  checkSize,
                )}
              >
                <Check className="h-3 w-3" />
              </div>
            ) : null}
            {resolving ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : null}
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                onShowMetadata(file);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                  event.preventDefault();
                  onShowMetadata(file);
                }
              }}
              title="File details"
              aria-label={`Details for ${file.fileName}`}
              className={cn(
                "absolute rounded-full bg-background/80 text-foreground flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer hover:bg-background",
                infoSize,
              )}
            >
              <Info className="h-3 w-3" />
            </span>
            {density !== "compact" ? (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-[11px] px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {file.fileName}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List renderer — table-style row with thumbnail + name + meta.
// ---------------------------------------------------------------------------

function CloudFilesList({
  files,
  resolvingId,
  selectionMode,
  isSelected,
  onTileClick,
  onShowMetadata,
}: FilesViewProps) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-card overflow-hidden">
      {files.map((file) => {
        const selected = isSelected(file.id);
        const resolving = resolvingId === file.id;
        const isBrowse = selectionMode === "none";
        const updatedAt = file.updatedAt ? new Date(file.updatedAt) : null;
        const sizeLabel = formatFileSize(file.fileSize);
        return (
          <li
            key={file.id}
            className={cn(
              "flex items-center gap-3 pl-2 pr-3 py-1.5 transition-colors",
              !isBrowse && selected ? "bg-primary/10" : "hover:bg-accent/40",
            )}
          >
            <button
              type="button"
              onClick={() => onTileClick(file)}
              disabled={resolving}
              className={cn(
                "flex flex-1 min-w-0 items-center gap-3 text-left focus:outline-none rounded-sm focus:ring-2 focus:ring-primary/40",
                resolving && "opacity-60 cursor-wait",
              )}
              aria-label={
                isBrowse
                  ? `Open ${file.fileName}`
                  : selected
                    ? `Deselect ${file.fileName}`
                    : `Select ${file.fileName}`
              }
            >
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-sm bg-muted/40">
                <MediaThumbnail
                  file={file}
                  iconSize={20}
                  className="absolute inset-0"
                />
                {resolving ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-foreground truncate">
                    {file.fileName}
                  </span>
                  {!isBrowse && selected ? (
                    <Check className="h-3 w-3 text-primary flex-shrink-0" />
                  ) : null}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {[
                    sizeLabel,
                    updatedAt ? formatRelative(updatedAt) : null,
                    file.mimeType,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onShowMetadata(file);
              }}
              aria-label={`Details for ${file.fileName}`}
              className="h-7 w-7 flex-shrink-0 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-center"
              title="File details"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function formatFileSize(bytes: number | null | undefined): string | null {
  if (!bytes || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
}

function CloudLoadingState() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">Loading your images...</span>
    </div>
  );
}

function CloudEmptyState({
  hasQuery,
  hasRecents,
}: {
  hasQuery: boolean;
  hasRecents: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        {hasQuery ? (
          <ImageOff className="h-7 w-7 text-muted-foreground" />
        ) : (
          <Cloud className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-base font-medium text-foreground mb-1">
        {hasQuery
          ? "No matching images"
          : hasRecents
            ? "No recent images"
            : "No images in your cloud yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasQuery
          ? "Try a different search term, or clear filters."
          : "Upload an image from the Upload tab and it will appear here automatically."}
      </p>
    </div>
  );
}
