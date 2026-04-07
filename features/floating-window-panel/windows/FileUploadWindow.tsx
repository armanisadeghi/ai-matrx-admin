"use client";

/**
 * FileUploadWindow — a floating WindowPanel for drag-and-drop file uploading
 * with sidebar-based destination selection and settings.
 *
 * Sidebar modes:
 *   Upload   — drop zone + file picker + clipboard paste
 *   Destination — folder tree to select upload target
 *   Settings — bucket selector + overwrite policy
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  FolderTree,
  Settings2,
  X,
  FileIcon,
  Loader2,
  Check,
  AlertCircle,
  Clipboard,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowPanel } from "../WindowPanel";
import FileSystemManager from "@/utils/file-operations/FileSystemManager";
import { useFileSystem } from "@/lib/redux/fileSystem/Provider";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { createFileSystemSelectors } from "@/lib/redux/fileSystem/selectors";
import { createFileSystemSlice } from "@/lib/redux/fileSystem/slice";
import type { AvailableBuckets, FileSystemNode } from "@/lib/redux/fileSystem/types";
import { openOverlay, closeOverlay } from "@/lib/redux/slices/overlaySlice";
import type { AppDispatch } from "@/lib/redux/store";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarTab = "upload" | "destination" | "settings";
type UploadStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export interface FileUploadWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Sidebar tab button ───────────────────────────────────────────────────────

function TabBtn({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Upload;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex flex-col items-center gap-0.5 px-2 py-2 rounded-md text-[10px] font-medium transition-colors w-full",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─── Simple folder tree for destination selection ─────────────────────────────

function FolderPicker({
  bucket,
  selectedPath,
  onSelect,
}: {
  bucket: AvailableBuckets;
  selectedPath: string;
  onSelect: (path: string) => void;
}) {
  const dispatch = useAppDispatch();
  const slice = createFileSystemSlice(bucket);
  const selectors = createFileSystemSelectors(bucket);
  const allNodes = useAppSelector(selectors.selectAllNodes);
  const isInitialized = useAppSelector(selectors.selectIsInitialized);
  const isLoading = useAppSelector(selectors.selectIsLoading);

  useEffect(() => {
    if (!isInitialized) {
      dispatch(slice.actions.listContents({ forceFetch: false }));
    }
  }, [isInitialized, dispatch, slice.actions]);

  const folders = useMemo(
    () => allNodes.filter((n) => n.contentType === "FOLDER"),
    [allNodes],
  );

  const rootFolders = useMemo(
    () => folders.filter((n) => n.parentId === "root"),
    [folders],
  );

  if (isLoading && !isInitialized) {
    return (
      <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="text-xs">
      {/* Root (bucket root) */}
      <button
        type="button"
        onClick={() => onSelect("")}
        className={cn(
          "flex items-center gap-1.5 w-full px-2 py-1 rounded-md transition-colors text-left",
          selectedPath === ""
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-accent text-muted-foreground",
        )}
      >
        <Database className="w-3 h-3" />
        <span className="truncate">{bucket} (root)</span>
      </button>

      {rootFolders.map((folder) => (
        <FolderItem
          key={folder.itemId}
          node={folder}
          allFolders={folders}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={1}
        />
      ))}
    </div>
  );
}

function FolderItem({
  node,
  allFolders,
  selectedPath,
  onSelect,
  depth,
}: {
  node: FileSystemNode;
  allFolders: FileSystemNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = allFolders.filter((n) => n.parentId === node.itemId);
  const isSelected = selectedPath === node.storagePath;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onSelect(node.storagePath);
          if (children.length > 0) setExpanded((v) => !v);
        }}
        className={cn(
          "flex items-center gap-1 w-full px-2 py-1 rounded-md transition-colors text-left",
          isSelected
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-accent text-foreground",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {children.length > 0 ? (
          expanded ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )
        ) : (
          <span className="w-3" />
        )}
        <Folder className="w-3 h-3 text-blue-500 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {expanded &&
        children.map((c) => (
          <FolderItem
            key={c.itemId}
            node={c}
            allFolders={allFolders}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

// ─── FileUploadWindow ─────────────────────────────────────────────────────────

export default function FileUploadWindow({
  isOpen,
  onClose,
}: FileUploadWindowProps) {
  const dispatch = useAppDispatch();
  const { availableBuckets } = useFileSystem();

  const [activeTab, setActiveTab] = useState<SidebarTab>("upload");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<AvailableBuckets>(
    availableBuckets[0] || ("user-public-assets" as AvailableBuckets),
  );
  const [selectedPath, setSelectedPath] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update bucket when available list changes
  useEffect(() => {
    if (availableBuckets.length > 0 && !availableBuckets.includes(selectedBucket)) {
      setSelectedBucket(availableBuckets[0]);
    }
  }, [availableBuckets, selectedBucket]);

  // ── Queue management ────────────────────────────────────────────────────

  const addFiles = useCallback((files: FileList | File[]) => {
    const items: QueueItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      status: "queued" as const,
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...items]);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue((prev) => prev.filter((q) => q.status === "uploading"));
  }, []);

  // ── Drag & Drop ─────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  // ── Paste handler ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split("/")[1] || "png";
            imageFiles.push(
              new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type }),
            );
          }
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addFiles(imageFiles);
        toast.success(`${imageFiles.length} image(s) added from clipboard`);
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [isOpen, addFiles]);

  // ── Upload execution ────────────────────────────────────────────────────

  const isUploading = queue.some((q) => q.status === "uploading");
  const queuedCount = queue.filter((q) => q.status === "queued").length;
  const doneCount = queue.filter((q) => q.status === "done").length;

  const totalSize = useMemo(
    () => queue.reduce((sum, q) => sum + q.file.size, 0),
    [queue],
  );

  const handleUploadAll = useCallback(async () => {
    const toUpload = queue.filter((q) => q.status === "queued");
    if (toUpload.length === 0) return;

    const fsm = FileSystemManager.getInstance();

    for (const item of toUpload) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id ? { ...q, status: "uploading" as const, progress: 50 } : q,
        ),
      );

      try {
        const targetPath = selectedPath
          ? `${selectedPath}/${item.file.name}`
          : item.file.name;

        await fsm.uploadFile(selectedBucket, targetPath, item.file);

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "done" as const, progress: 100 }
              : q,
          ),
        );
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : q,
          ),
        );
      }
    }

    toast.success("Upload complete");
  }, [queue, selectedBucket, selectedPath, overwrite]);

  // ── Sidebar content ─────────────────────────────────────────────────────

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-1 p-1.5 border-b border-border">
        <TabBtn
          active={activeTab === "upload"}
          icon={Upload}
          label="Upload"
          onClick={() => setActiveTab("upload")}
        />
        <TabBtn
          active={activeTab === "destination"}
          icon={FolderTree}
          label="Folder"
          onClick={() => setActiveTab("destination")}
        />
        <TabBtn
          active={activeTab === "settings"}
          icon={Settings2}
          label="Settings"
          onClick={() => setActiveTab("settings")}
        />
      </div>

      {/* Destination quick info */}
      <div className="p-2 text-[10px] text-muted-foreground border-b border-border">
        <div className="font-medium text-foreground mb-0.5">Upload to:</div>
        <div className="truncate">{selectedBucket}</div>
        {selectedPath && (
          <div className="truncate text-primary">/{selectedPath}</div>
        )}
      </div>

      {/* Queue summary */}
      <div className="p-2 text-[10px] text-muted-foreground mt-auto">
        <div>{queue.length} file(s) · {formatSize(totalSize)}</div>
        {doneCount > 0 && (
          <div className="text-green-500">{doneCount} uploaded</div>
        )}
      </div>
    </div>
  );

  // ── Main content per tab ────────────────────────────────────────────────

  const renderMainContent = () => {
    switch (activeTab) {
      case "upload":
        return (
          <div className="flex flex-col h-full min-h-0">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-6 m-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors shrink-0",
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
              )}
            >
              <Upload
                className={cn(
                  "w-8 h-8 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground",
                )}
              />
              <div className="text-center">
                <p className="text-xs font-medium">
                  {isDragging ? "Drop files here" : "Click or drag files"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Ctrl+V to paste images
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {/* File queue */}
            <div className="flex-1 min-h-0 overflow-auto px-3 pb-3">
              {queue.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  No files in queue
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30 border border-border group"
                    >
                      <StatusIcon status={item.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{item.file.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatSize(item.file.size)}
                          {item.error && (
                            <span className="text-destructive ml-1">
                              — {item.error}
                            </span>
                          )}
                        </p>
                      </div>
                      {item.status !== "uploading" && (
                        <button
                          type="button"
                          onClick={() => removeFromQueue(item.id)}
                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
                          aria-label="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case "destination":
        return (
          <div className="h-full overflow-auto p-3">
            <p className="text-xs font-medium mb-2">Select destination folder</p>
            <div className="space-y-1">
              {availableBuckets.map((b) => (
                <div key={b}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBucket(b);
                      setSelectedPath("");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                      selectedBucket === b
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent text-foreground",
                    )}
                  >
                    <Database className="w-3.5 h-3.5" />
                    {b}
                  </button>
                  {selectedBucket === b && (
                    <div className="ml-2 mt-0.5">
                      <FolderPicker
                        bucket={b}
                        selectedPath={selectedPath}
                        onSelect={setSelectedPath}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-medium">Target Bucket</label>
              <select
                value={selectedBucket}
                onChange={(e) =>
                  setSelectedBucket(e.target.value as AvailableBuckets)
                }
                className="mt-1 w-full text-xs px-2 py-1.5 rounded-md border border-border bg-background"
              >
                {availableBuckets.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="overwrite-toggle"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="overwrite-toggle" className="text-xs">
                Overwrite existing files
              </label>
            </div>

            <div className="text-[10px] text-muted-foreground space-y-1 pt-2 border-t border-border">
              <p>
                <strong>Public buckets</strong> — files accessible via direct URL
              </p>
              <p>
                <strong>Private buckets</strong> — files require signed URL
                (auth required)
              </p>
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <WindowPanel
      id="file-upload-window"
      title="Upload Files"
      onClose={onClose}
      minWidth={420}
      minHeight={340}
      width={560}
      height={480}
      sidebar={sidebarContent}
      sidebarDefaultSize={18}
      sidebarMinSize={12}
      sidebarClassName="bg-muted/20"
      footerLeft={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            Close
          </button>
          {queue.length > 0 && (
            <button
              type="button"
              onClick={clearQueue}
              disabled={isUploading}
              className="px-2.5 py-1 text-xs rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
            >
              Clear
            </button>
          )}
        </div>
      }
      footerRight={
        <button
          type="button"
          onClick={handleUploadAll}
          disabled={queuedCount === 0 || isUploading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            queuedCount > 0 && !isUploading
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {isUploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          {isUploading
            ? "Uploading…"
            : `Upload (${queuedCount})`}
        </button>
      }
    >
      {renderMainContent()}
    </WindowPanel>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: UploadStatus }) {
  switch (status) {
    case "queued":
      return <FileIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
    case "uploading":
      return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />;
    case "done":
      return <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />;
    case "error":
      return <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Redux dispatch helper ────────────────────────────────────────────────────

export function openFileUploadWindow(dispatch: AppDispatch) {
  dispatch(openOverlay({ overlayId: "fileUploadWindow" }));
}
