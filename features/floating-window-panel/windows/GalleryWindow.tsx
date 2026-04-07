"use client";

/**
 * GalleryWindow — floating window shell for the image gallery.
 *
 * Multi-window pattern: clicking an image opens ImageViewerWindow
 * for full zoom/pan/download. Favorites sidebar tracks liked images.
 */

import React, { useState } from "react";
import { Columns2, Grid3X3, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import {
  GalleryFloatingWorkspace,
} from "@/features/gallery/components/GalleryFloatingWorkspace";

interface GalleryWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = "grid" | "masonry" | "compact";

export default function GalleryWindow({ isOpen, onClose }: GalleryWindowProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("masonry");

  if (!isOpen) return null;

  return (
    <GalleryWindowInner
      onClose={onClose}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}

function GalleryWindowInner({
  onClose,
  viewMode,
  onViewModeChange,
}: {
  onClose: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const workspace = GalleryFloatingWorkspace();

  const footerRight = (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onViewModeChange("masonry")}
        title="Masonry view"
        className={cn(
          "p-1 rounded-md transition-colors",
          viewMode === "masonry"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
        )}
      >
        <Columns2 className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("grid")}
        title="Grid view"
        className={cn(
          "p-1 rounded-md transition-colors",
          viewMode === "grid"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
        )}
      >
        <LayoutGrid className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("compact")}
        title="Compact view"
        className={cn(
          "p-1 rounded-md transition-colors",
          viewMode === "compact"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
        )}
      >
        <Grid3X3 className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <WindowPanel
      title="Gallery"
      id="gallery-window-default"
      minWidth={380}
      minHeight={320}
      width={680}
      height={540}
      onClose={onClose}
      urlSyncKey="gallery"
      urlSyncId="default"
      sidebar={workspace.sidebar}
      sidebarDefaultSize={15}
      sidebarMinSize={10}
      sidebarClassName="bg-muted/10"
      defaultSidebarOpen={false}
      footerRight={footerRight}
    >
      {workspace.body}
    </WindowPanel>
  );
}
