"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilesystemAdapter } from "../../adapters/FilesystemAdapter";
import type { FilesystemNode } from "../../types";
import { FileIcon } from "../../styles/file-icon";
import { extractErrorMessage } from "@/utils/errors";
import {
  ACTIVE_ROW,
  HOVER_ROW,
  ROW_HEIGHT,
  TEXT_BODY,
} from "../../styles/tokens";
import { useDirectoryVersion } from "./FileTreeWatcher";

interface FileTreeNodeProps {
  node: FilesystemNode;
  depth: number;
  adapter: FilesystemAdapter;
  isExpanded: (path: string) => boolean;
  onToggle: (path: string) => void;
  onOpenFile: (path: string) => void;
  activePath: string | null;
}

export const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  depth,
  adapter,
  isExpanded,
  onToggle,
  onOpenFile,
  activePath,
}) => {
  const expanded = isExpanded(node.path);
  const isDir = node.kind === "directory";
  const [children, setChildren] = useState<FilesystemNode[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Refetch when a watch event invalidates this directory.
  const version = useDirectoryVersion(node.path);

  useEffect(() => {
    let cancelled = false;
    if (!isDir || !expanded) return;
    adapter
      .listChildren(node.path)
      .then((list) => {
        if (!cancelled) {
          setChildren(list);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(extractErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [isDir, expanded, adapter, node.path, version]);

  const handleClick = useCallback(() => {
    if (isDir) onToggle(node.path);
    else onOpenFile(node.path);
  }, [isDir, node.path, onOpenFile, onToggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      } else if (e.key === "ArrowRight" && isDir && !expanded) {
        e.preventDefault();
        onToggle(node.path);
      } else if (e.key === "ArrowLeft" && isDir && expanded) {
        e.preventDefault();
        onToggle(node.path);
      }
    },
    [handleClick, isDir, expanded, node.path, onToggle],
  );

  // Drop zone for OS file uploads. Only directories accept drops; the file
  // is written into that directory using its original basename. Adapters
  // without an `upload` method silently no-op.
  const [dragOver, setDragOver] = useState(false);
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isDir || !adapter.upload) return;
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      }
    },
    [isDir, adapter],
  );
  const handleDragLeave = useCallback(() => {
    if (dragOver) setDragOver(false);
  }, [dragOver]);
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      if (!isDir || !adapter.upload) return;
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      const dirPath = node.path.replace(/\/$/, "");
      try {
        for (const file of files) {
          const target = `${dirPath}/${file.name}`;
          await adapter.upload!(target, file);
        }
        // Auto-expand to surface what was just dropped.
        if (!expanded) onToggle(node.path);
      } catch (err) {
        setLoadError(extractErrorMessage(err));
      }
    },
    [isDir, adapter, node.path, expanded, onToggle],
  );

  return (
    <div className="select-none">
      <div
        role="treeitem"
        aria-expanded={isDir ? expanded : undefined}
        aria-selected={activePath === node.path}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => void handleDrop(e)}
        className={cn(
          "flex items-center gap-1 text-[13px]",
          ROW_HEIGHT,
          TEXT_BODY,
          HOVER_ROW,
          activePath === node.path && ACTIVE_ROW,
          dragOver &&
            "bg-blue-100 outline outline-1 outline-blue-400 dark:bg-blue-950/60",
          "cursor-pointer rounded-sm",
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {isDir ? (
          <ChevronRight
            size={12}
            className={cn(
              "shrink-0 text-neutral-500 transition-transform",
              expanded && "rotate-90",
            )}
          />
        ) : (
          <span className="inline-block w-3" />
        )}
        <FileIcon name={node.name} kind={node.kind} expanded={expanded} />
        <span className="truncate">{node.name}</span>
      </div>

      {isDir && expanded && (
        <div role="group">
          {loadError && (
            <div
              className="px-2 text-[11px] text-red-500"
              style={{ paddingLeft: 8 + (depth + 1) * 12 }}
            >
              {loadError}
            </div>
          )}
          {children === null && !loadError && (
            <div
              className="px-2 text-[11px] text-neutral-500"
              style={{ paddingLeft: 8 + (depth + 1) * 12 }}
            >
              Loading…
            </div>
          )}
          {children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              adapter={adapter}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
              activePath={activePath}
            />
          ))}
        </div>
      )}
    </div>
  );
};
