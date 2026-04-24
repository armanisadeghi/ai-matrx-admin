"use client";

import React, { useState } from "react";
import { FolderPlus, RefreshCw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import {
  loadCodeFilesList,
  loadCodeFolders,
  selectCodeFilesListStatus,
} from "@/features/code-files";
import { SidePanelHeader, SidePanelAction } from "../SidePanelChrome";
import { LibraryTree } from "./LibraryTree";

interface LibraryPanelProps {
  className?: string;
}

/**
 * Side-panel view that surfaces the user's saved code — `code_files` +
 * `code_folders` — in a tree. Clicking a file opens it in the main Monaco
 * tabs. Writes round-trip through `saveFileNow` (see useSaveActiveTab).
 *
 * This is the primary integration point between ad-hoc code-generating
 * surfaces (chat code blocks, HTML preview modal) and the code editor: any
 * caller that saves a `code_files` row automatically surfaces here.
 */
export const LibraryPanel: React.FC<LibraryPanelProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const listStatus = useAppSelector(selectCodeFilesListStatus);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => {
    dispatch(loadCodeFilesList());
    dispatch(loadCodeFolders());
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader
        title="Code Library"
        subtitle={
          listStatus === "loading"
            ? "Loading…"
            : listStatus === "loaded"
              ? "Your saved code"
              : undefined
        }
        actions={
          <>
            <SidePanelAction
              icon={FolderPlus}
              label="New Folder"
              onClick={() => undefined}
            />
            <SidePanelAction
              icon={RefreshCw}
              label="Refresh Library"
              onClick={refresh}
            />
          </>
        }
      />

      <div className="flex items-start gap-1.5 border-b border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
        <div className="flex-1">
          Everything you save via{" "}
          <span className="font-mono">Save to Code</span> or{" "}
          <span className="font-mono">Save &amp; open in editor</span> shows up
          here.
        </div>
      </div>

      <LibraryTree refreshKey={refreshKey} />
    </div>
  );
};
