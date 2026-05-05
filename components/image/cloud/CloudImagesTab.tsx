/**
 * components/image/cloud/CloudImagesTab.tsx
 *
 * Live image gallery sourced from the user's cloud-files Redux slice.
 * Filters to image-MIME records, supports search and a Recents (last 30d)
 * filter, and renders selectable tiles using the canonical
 * `<MediaThumbnail>` so signed URLs and CDN URLs are handled consistently.
 *
 * Selection writes `ImageSource` with `type: "cloud-file"` and stashes
 * `metadata.fileId` so downstream features can deep-link back into the
 * cloud-files surfaces (preview, share, restore version).
 */

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, ImageOff, Loader2, Check, Clock, Cloud } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

const RECENTS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

  const [query, setQuery] = useState("");
  const [showRecentsOnly, setShowRecentsOnly] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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

  const handleToggleCloudFile = async (file: CloudFileRecord) => {
    const sourceId = `cloud:${file.id}`;
    if (isSelected(sourceId)) {
      // Just toggle off — no resolution needed.
      toggleImage({
        type: "cloud-file",
        url: file.publicUrl ?? "",
        id: sourceId,
      } as ImageSource);
      return;
    }
    try {
      setResolvingId(file.id);
      // In single mode, replace any existing selection.
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
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {imageFiles.map((file) => {
                const sourceId = `cloud:${file.id}`;
                const selected = isSelected(sourceId);
                const resolving = resolvingId === file.id;
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => handleToggleCloudFile(file)}
                    disabled={resolving}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-md border-2 transition-all bg-muted/40",
                      "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40",
                      selected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent",
                      resolving && "opacity-60 cursor-wait",
                    )}
                    title={file.fileName}
                  >
                    <MediaThumbnail
                      file={file}
                      iconSize={48}
                      className="absolute inset-0"
                    />
                    {selected ? (
                      <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    ) : null}
                    {resolving ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : null}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-[11px] px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {file.fileName}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
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
