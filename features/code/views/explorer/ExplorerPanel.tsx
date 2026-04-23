"use client";

import React from "react";
import {
  FilePlus,
  FolderPlus,
  Info,
  MoreHorizontal,
  RefreshCw,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { setActiveView } from "../../redux";
import { useCodeWorkspace } from "../../CodeWorkspaceProvider";
import { SidePanelHeader, SidePanelAction } from "../SidePanelChrome";
import { FileTree } from "./FileTree";

interface ExplorerPanelProps {
  className?: string;
}

export const ExplorerPanel: React.FC<ExplorerPanelProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const { filesystem } = useCodeWorkspace();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const isMock = filesystem.id === "mock";

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader
        title="Explorer"
        subtitle={filesystem.label}
        actions={
          <>
            <SidePanelAction
              icon={FilePlus}
              label="New File"
              onClick={() => undefined}
            />
            <SidePanelAction
              icon={FolderPlus}
              label="New Folder"
              onClick={() => undefined}
            />
            <SidePanelAction
              icon={RefreshCw}
              label="Refresh Explorer"
              onClick={() => setRefreshKey((k) => k + 1)}
            />
            <SidePanelAction
              icon={MoreHorizontal}
              label="More"
              onClick={() => undefined}
            />
          </>
        }
      />
      {isMock && (
        <div className="flex items-start gap-1.5 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <Info size={12} className="mt-[2px] shrink-0" />
          <div className="flex-1">
            <div>Viewing a demo project. Files aren't real.</div>
            <button
              type="button"
              onClick={() => dispatch(setActiveView("sandboxes"))}
              className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-100"
            >
              <Server size={10} />
              Connect a sandbox
            </button>
          </div>
        </div>
      )}
      <FileTree key={refreshKey} />
    </div>
  );
};
