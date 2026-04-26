"use client";

import React from "react";
import { cn } from "@/lib/utils";
// Side effect: register builtin library-source adapters (prompt_apps, aga_apps, tool_ui).
import "./library-sources/registerBuiltinLibrarySources";
import type { FilesystemAdapter } from "./adapters/FilesystemAdapter";
import type { ProcessAdapter } from "./adapters/ProcessAdapter";
import { CodeWorkspaceProvider } from "./CodeWorkspaceProvider";
import { WorkspaceLayout } from "./layout/WorkspaceLayout";
import { useOpenCodeFileFromUrl } from "./hooks/useOpenCodeFileFromUrl";
import { useTabRealtimeWatcher } from "./hooks/useTabRealtimeWatcher";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveSandboxId } from "./redux/codeWorkspaceSlice";
import { useSandboxHeartbeat } from "@/hooks/sandbox/use-sandbox-heartbeat";

export interface CodeWorkspaceProps {
  /** Stable id used by agent tools to target this workspace instance. */
  workspaceId?: string;
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
  workspaceId,
  adapter,
  process,
  rightSlot,
  farRightSlot,
  showStatusBar = true,
  className,
}) => {
  return (
    <CodeWorkspaceProvider
      workspaceId={workspaceId}
      initialFilesystem={adapter}
      initialProcess={process}
    >
      <UrlOpenFileBridge />
      <SandboxHeartbeatBridge />
      <TabRealtimeBridge />
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

/** Zero-render bridge that watches `?open=<codeFileId>` and opens the file.
 *  Split out into its own component so it can call hooks that depend on
 *  `CodeWorkspaceProvider` being mounted. */
const UrlOpenFileBridge: React.FC = () => {
  useOpenCodeFileFromUrl();
  return null;
};

/** Zero-render bridge that pings the orchestrator's heartbeat endpoint while a
 *  sandbox is connected so the idle-shutdown sweep doesn't reap an active
 *  editor session. Disabled (no network calls) when no sandbox is active. */
const SandboxHeartbeatBridge: React.FC = () => {
  const activeSandboxId = useAppSelector(selectActiveSandboxId);
  useSandboxHeartbeat(activeSandboxId, { enabled: Boolean(activeSandboxId) });
  return null;
};

/** Zero-render bridge that opens a Supabase Realtime subscription for every
 *  open library-source-backed tab so we hear about remote edits while the
 *  user is in the middle of typing. Refreshes the optimistic-concurrency
 *  watermark and warns on dirty tabs whose row moved on. */
const TabRealtimeBridge: React.FC = () => {
  useTabRealtimeWatcher();
  return null;
};
