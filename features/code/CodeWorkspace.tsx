"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { FilesystemAdapter, ProcessAdapter } from "./adapters";
import { CodeWorkspaceProvider } from "./CodeWorkspaceProvider";
import { WorkspaceLayout } from "./layout/WorkspaceLayout";

export interface CodeWorkspaceProps {
  /** Initial filesystem adapter. Defaults to the mock project. */
  adapter?: FilesystemAdapter;
  /** Initial process adapter. Defaults to a mock echo adapter. */
  process?: ProcessAdapter;
  /** Optional chat surface (e.g. <AgentRunnerPage />). */
  rightSlot?: React.ReactNode;
  /** Optional chat-history sidebar (e.g. <AgentRunSidebarMenu />). */
  farRightSlot?: React.ReactNode;
  /** Whether to render the bottom status bar. */
  showStatusBar?: boolean;
  className?: string;
}

/**
 * Self-contained VSCode-style workspace. Consumers render this directly from
 * a route, a window panel, a modal, or anywhere else — it owns its own
 * provider tree but relies on the app-level Redux store for slice state.
 */
export const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({
  adapter,
  process,
  rightSlot,
  farRightSlot,
  showStatusBar = true,
  className,
}) => {
  return (
    <CodeWorkspaceProvider initialFilesystem={adapter} initialProcess={process}>
      <div className={cn("flex h-full w-full min-h-0", className)}>
        <WorkspaceLayout
          rightSlot={rightSlot}
          farRightSlot={farRightSlot}
          showStatusBar={showStatusBar}
        />
      </div>
    </CodeWorkspaceProvider>
  );
};

export default CodeWorkspace;
