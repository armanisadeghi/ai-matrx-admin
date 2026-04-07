"use client";

/**
 * QuickFilesWindow — compact file browser in a floating WindowPanel.
 *
 * • Left sidebar: Category/bucket filters via compact icon buttons
 * • Main area: MultiBucketFileTree rendered directly, zero wrapper chrome
 * • Footer: Selected file badge, search, action buttons (upload/preview/full view)
 * • On file click: opens FilePreviewWindow via Redux overlay dispatch
 */

import React, { useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Upload,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  Music,
  FileText,
  Film,
  Code2,
  Files,
  Database,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { openFilePreview } from "./FilePreviewWindow";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import type {
  AvailableBuckets,
  FileSystemNode,
} from "@/lib/redux/fileSystem/types";
import { availableBuckets } from "@/lib/redux/rootReducer";

const MultiBucketFileTree = dynamic(
  () => import("@/components/file-system/draggable/MultiBucketFileTree"),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickFilesWindowProps {
  isOpen: boolean;
  onClose?: () => void;
}

type CategoryFilter =
  | "all"
  | "images"
  | "audio"
  | "documents"
  | "videos"
  | "code";

const CATEGORY_FILTERS: {
  value: CategoryFilter;
  label: string;
  icon: typeof Files;
  buckets?: AvailableBuckets[];
}[] = [
  { value: "all", label: "All", icon: Files },
  {
    value: "images",
    label: "Images",
    icon: ImageIcon,
    buckets: ["Images" as AvailableBuckets],
  },
  {
    value: "audio",
    label: "Audio",
    icon: Music,
    buckets: ["Audio" as AvailableBuckets],
  },
  {
    value: "documents",
    label: "Docs",
    icon: FileText,
    buckets: ["Documents" as AvailableBuckets, "Notes" as AvailableBuckets],
  },
  {
    value: "videos",
    label: "Videos",
    icon: Film,
    buckets: ["Videos" as AvailableBuckets],
  },
  {
    value: "code",
    label: "Code",
    icon: Code2,
    buckets: ["Code" as AvailableBuckets, "code-editor" as AvailableBuckets],
  },
];

// ─── QuickFilesWindow ─────────────────────────────────────────────────────────

export default function QuickFilesWindow({
  isOpen,
  onClose,
}: QuickFilesWindowProps) {
  const dispatch = useAppDispatch();
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [activeBucket, setActiveBucket] = useState<AvailableBuckets | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Determine which buckets to show based on active filter
  const filteredBuckets = useMemo<AvailableBuckets[]>(() => {
    if (activeFilter === "all") return [...availableBuckets];
    const filter = CATEGORY_FILTERS.find((f) => f.value === activeFilter);
    if (filter?.buckets) {
      return filter.buckets.filter((b) => availableBuckets.includes(b));
    }
    return [...availableBuckets];
  }, [activeFilter]);

  // Default expanded buckets (expand first 2, or the filtered set)
  const defaultExpanded = useMemo<AvailableBuckets[]>(() => {
    if (activeFilter !== "all") return filteredBuckets;
    return filteredBuckets.slice(0, 2);
  }, [activeFilter, filteredBuckets]);

  // Handle file click → open FilePreviewWindow
  const handleViewFile = useCallback(
    (node: FileSystemNode) => {
      if (node.contentType !== "FILE") return;
      openFilePreview(dispatch, {
        bucket: node.bucket,
        storagePath: node.storagePath,
        fileName: node.name,
        extension: node.extension,
        size: node.metadata?.size,
        instanceId: "quick-files-preview",
      });
    },
    [dispatch],
  );

  // Open upload window
  const handleOpenUpload = useCallback(() => {
    dispatch(openOverlay({ overlayId: "fileUploadWindow" }));
  }, [dispatch]);

  // Track active bucket for footer display
  const handleBucketSelect = useCallback((bucket: AvailableBuckets) => {
    setActiveBucket(bucket);
  }, []);

  if (!isOpen) return null;

  // ── Sidebar: Category filter buttons ────────────────────────────────────

  const sidebar = (
    <div className="flex flex-col gap-0.5 p-1.5">
      {CATEGORY_FILTERS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setActiveFilter(value)}
          title={label}
          className={cn(
            "flex flex-col items-center gap-0.5 px-2 py-2 rounded-md text-[10px] font-medium transition-colors",
            activeFilter === value
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}

      {/* Separator */}
      <div className="h-px bg-border my-1" />

      {/* Per-bucket quick access */}
      {availableBuckets.slice(0, 6).map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => {
            setActiveFilter("all");
            // This doesn't change the filter but highlights intent
          }}
          title={b}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors truncate"
        >
          <Database className="w-3 h-3 shrink-0" />
          <span className="truncate">{b}</span>
        </button>
      ))}
    </div>
  );

  // ── Footer ──────────────────────────────────────────────────────────────

  const footerLeft = (
    <div className="flex items-center gap-1.5">
      {activeBucket && (
        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
          {activeBucket}
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          setShowSearch((v) => !v);
          setTimeout(() => searchRef.current?.focus(), 50);
        }}
        title="Search files"
        className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const footerRight = (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={handleOpenUpload}
        title="Upload files"
        className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => window.open("/files", "_blank")}
        title="Open full file manager"
        className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <WindowPanel
      title="Files"
      width={900}
      height={550}
      minWidth={450}
      minHeight={320}
      onClose={onClose}
      sidebar={sidebar}
      sidebarDefaultSize={14}
      sidebarMinSize={10}
      sidebarClassName="bg-muted/10"
      footerLeft={footerLeft}
      footerRight={footerRight}
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Optional search bar */}
        {showSearch && (
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border shrink-0">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="p-0.5 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* File tree — takes all remaining space */}
        <div className="flex-1 min-h-0 overflow-auto">
          <MultiBucketFileTree
            buckets={filteredBuckets}
            defaultExpandedBuckets={defaultExpanded}
            onViewFile={handleViewFile}
            onBucketSelect={handleBucketSelect}
          />
        </div>
      </div>
    </WindowPanel>
  );
}
