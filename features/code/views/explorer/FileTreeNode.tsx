"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilesystemAdapter } from "../../adapters";
import type { FilesystemNode } from "../../types";
import { FileIcon } from "../../styles/file-icon";
import {
  ACTIVE_ROW,
  HOVER_ROW,
  ROW_HEIGHT,
  TEXT_BODY,
} from "../../styles/tokens";

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

  useEffect(() => {
    let cancelled = false;
    if (!isDir || !expanded || children !== null) return;
    adapter
      .listChildren(node.path)
      .then((list) => {
        if (!cancelled) setChildren(list);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [isDir, expanded, children, adapter, node.path]);

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

  return (
    <div className="select-none">
      <div
        role="treeitem"
        aria-expanded={isDir ? expanded : undefined}
        aria-selected={activePath === node.path}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-1 text-[13px]",
          ROW_HEIGHT,
          TEXT_BODY,
          HOVER_ROW,
          activePath === node.path && ACTIVE_ROW,
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
