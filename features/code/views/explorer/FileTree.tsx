"use client";

import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { useCodeWorkspace } from "../../CodeWorkspaceProvider";
import { useOpenFile } from "../../hooks/useOpenFile";
import type { FilesystemNode } from "../../types";
import { selectActiveTab } from "../../redux/tabsSlice";
import { selectExplorerRootOverride } from "../../redux/codeWorkspaceSlice";
import { FileTreeNode } from "./FileTreeNode";
import { useFileTreeExpansion } from "./useFileTreeExpansion";
import { extractErrorMessage } from "@/utils/errors";
import {
  FileTreeWatcherProvider,
  useDirectoryVersion,
} from "./FileTreeWatcher";

interface FileTreeProps {
  refreshKey?: number;
}

export const FileTree: React.FC<FileTreeProps> = ({ refreshKey = 0 }) => {
  const { filesystem } = useCodeWorkspace();
  const override = useAppSelector(selectExplorerRootOverride);
  const rootPath = override ?? filesystem.rootPath;

  return (
    <FileTreeWatcherProvider rootPath={rootPath}>
      <FileTreeBody rootPath={rootPath} refreshKey={refreshKey} />
    </FileTreeWatcherProvider>
  );
};

const FileTreeBody: React.FC<{ rootPath: string; refreshKey: number }> = ({
  rootPath,
  refreshKey,
}) => {
  const { filesystem } = useCodeWorkspace();
  const openFile = useOpenFile();
  const activeTab = useAppSelector(selectActiveTab);

  const { isExpanded, toggle } = useFileTreeExpansion([rootPath]);
  const [roots, setRoots] = useState<FilesystemNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The root directory has its own watch version — when the parent of any
  // top-level entry changes (e.g. a new file was created at the root) we
  // refetch the root listing.
  const rootVersion = useDirectoryVersion(rootPath);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    filesystem
      .listChildren(rootPath)
      .then((list) => {
        if (!cancelled) setRoots(list);
      })
      .catch((err) => {
        if (!cancelled)
          setError(extractErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [filesystem, rootPath, refreshKey, rootVersion]);

  const handleOpen = (path: string) => {
    openFile(path).catch((err) => {
      setError(extractErrorMessage(err));
    });
  };

  return (
    <div
      role="tree"
      aria-label="File tree"
      className="flex-1 overflow-y-auto py-1"
    >
      {error && (
        <div className="px-3 py-1 text-[11px] text-red-500">{error}</div>
      )}
      {roots === null && !error && (
        <div className="px-3 py-1 text-[11px] text-neutral-500">Loading…</div>
      )}
      {roots?.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          adapter={filesystem}
          isExpanded={isExpanded}
          onToggle={toggle}
          onOpenFile={handleOpen}
          activePath={activeTab?.path ?? null}
        />
      ))}
      {roots?.length === 0 && !error && (
        <div className="px-3 py-1 text-[11px] text-neutral-500">
          Empty directory
        </div>
      )}
    </div>
  );
};
