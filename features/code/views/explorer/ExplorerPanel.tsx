"use client";

import React from "react";
import { FilePlus, FolderPlus, MoreHorizontal, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCodeWorkspace } from "../../CodeWorkspaceProvider";
import { SidePanelHeader, SidePanelAction } from "../SidePanelChrome";
import { FileTree } from "./FileTree";

interface ExplorerPanelProps {
  className?: string;
}

export const ExplorerPanel: React.FC<ExplorerPanelProps> = ({ className }) => {
  const { filesystem } = useCodeWorkspace();
  const [refreshKey, setRefreshKey] = React.useState(0);

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
      <FileTree key={refreshKey} />
    </div>
  );
};
