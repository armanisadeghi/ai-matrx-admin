"use client";

import React, { useCallback } from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { CodeWorkspace } from "../CodeWorkspace";
import type { FilesystemAdapter, ProcessAdapter } from "../adapters";

export interface CodeWorkspaceWindowProps {
  windowInstanceId: string;
  title?: string | null;
  /** Optional initial adapter. Defaults to mock project. */
  adapter?: FilesystemAdapter;
  process?: ProcessAdapter;
  /** Optional chat surface injected into the right slot. */
  rightSlot?: React.ReactNode;
  /** Optional chat-history surface injected into the far-right slot. */
  farRightSlot?: React.ReactNode;
  onClose: () => void;
}

/**
 * Thin wrapper that mounts a CodeWorkspace inside a floating WindowPanel.
 *
 * No custom sidebar is passed to WindowPanel: the CodeWorkspace carries its
 * own ActivityBar + SidePanel, which is the correct mental model for a full
 * IDE surface.
 */
export function CodeWorkspaceWindow({
  windowInstanceId,
  title,
  adapter,
  process,
  rightSlot,
  farRightSlot,
  onClose,
}: CodeWorkspaceWindowProps) {
  const handleCollectData = useCallback(() => {
    // Ephemeral window — we persist geometry via WindowPanel but don't need to
    // checkpoint the workspace state itself (that lives in Redux already).
    return {};
  }, []);

  return (
    <WindowPanel
      id={`code-workspace-window-${windowInstanceId}`}
      title={title ?? "Code Workspace"}
      overlayId="codeWorkspaceWindow"
      minWidth={720}
      minHeight={480}
      width={1240}
      height={760}
      position="center"
      onClose={onClose}
      onCollectData={handleCollectData}
      bodyClassName="p-0 overflow-hidden"
    >
      <div className="flex h-full w-full min-h-0">
        <CodeWorkspace
          adapter={adapter}
          process={process}
          rightSlot={rightSlot}
          farRightSlot={farRightSlot}
        />
      </div>
    </WindowPanel>
  );
}

export default CodeWorkspaceWindow;
