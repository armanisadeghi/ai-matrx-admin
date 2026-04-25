"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { makeSelectChildFolders, makeSelectFilesInFolder } from "@/features/code-files/redux/selectors";
import { type CodeFolder } from "@/features/code-files/redux/code-files.types";
import { useAppSelector } from "@/lib/redux/hooks";
import { FileIcon } from "../../styles/file-icon";
import {
  ACTIVE_ROW,
  HOVER_ROW,
  ROW_HEIGHT,
  TEXT_BODY,
} from "../../styles/tokens";
import { libraryTabId } from "../../hooks/useOpenLibraryFile";

interface LibraryTreeNodeProps {
  folder: CodeFolder;
  depth: number;
  onOpenFile: (codeFileId: string) => void;
  activeTabId: string | null;
}

/**
 * Recursive tree node for a `code_folders` row. Renders the folder header and,
 * when expanded, its nested subfolders and files (unfiled files are handled
 * separately at the root level).
 */
export const LibraryTreeNode: React.FC<LibraryTreeNodeProps> = ({
  folder,
  depth,
  onOpenFile,
  activeTabId,
}) => {
  const [expanded, setExpanded] = useState(depth === 0);

  const selectChildFolders = useMemo(
    () => makeSelectChildFolders(folder.id),
    [folder.id],
  );
  const selectFilesInFolder = useMemo(
    () => makeSelectFilesInFolder(folder.id),
    [folder.id],
  );
  const childFolders = useAppSelector(selectChildFolders);
  const files = useAppSelector(selectFilesInFolder);

  const hasChildren = childFolders.length > 0 || files.length > 0;

  const toggle = useCallback(() => setExpanded((e) => !e), []);

  return (
    <div className="select-none">
      <div
        role="treeitem"
        aria-expanded={expanded}
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={cn(
          "flex items-center gap-1 text-[13px] cursor-pointer rounded-sm",
          ROW_HEIGHT,
          TEXT_BODY,
          HOVER_ROW,
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        title={folder.description ?? folder.name}
      >
        <ChevronRight
          size={12}
          className={cn(
            "shrink-0 text-neutral-500 transition-transform",
            expanded && "rotate-90",
            !hasChildren && "opacity-30",
          )}
        />
        {expanded ? (
          <FolderOpen size={14} className="shrink-0 text-blue-500" />
        ) : (
          <Folder size={14} className="shrink-0 text-blue-500" />
        )}
        <span className="truncate">{folder.name}</span>
      </div>

      {expanded && (
        <div role="group">
          {childFolders.map((child) => (
            <LibraryTreeNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              onOpenFile={onOpenFile}
              activeTabId={activeTabId}
            />
          ))}
          {files.map((file) => {
            const tabId = libraryTabId(file.id);
            const active = activeTabId === tabId;
            return (
              <div
                key={file.id}
                role="treeitem"
                aria-selected={active}
                tabIndex={0}
                onClick={() => onOpenFile(file.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenFile(file.id);
                  }
                }}
                className={cn(
                  "flex items-center gap-1 text-[13px] cursor-pointer rounded-sm",
                  ROW_HEIGHT,
                  TEXT_BODY,
                  HOVER_ROW,
                  active && ACTIVE_ROW,
                )}
                style={{ paddingLeft: 8 + (depth + 1) * 12 }}
                title={file.path ?? file.name}
              >
                <span className="inline-block w-3" />
                <FileIcon name={file.name} kind="file" />
                <span className="truncate">{file.name}</span>
                {file._dirty && (
                  <span
                    className="ml-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400 dark:bg-neutral-500"
                    aria-label="Unsaved changes"
                  />
                )}
              </div>
            );
          })}
          {!hasChildren && (
            <div
              className="text-[11px] text-neutral-500"
              style={{ paddingLeft: 8 + (depth + 1) * 12 }}
            >
              Empty folder
            </div>
          )}
        </div>
      )}
    </div>
  );
};
