"use client";

import React, { useCallback } from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { CodeWorkspace } from "../CodeWorkspace";
import type { FilesystemAdapter } from "../adapters/FilesystemAdapter";
import type { ProcessAdapter } from "../adapters/ProcessAdapter";
import { ChatPanelSlot } from "../chat/ChatPanelSlot";
import { ChatHistorySlot } from "../chat/ChatHistorySlot";

export interface CodeWorkspaceWindowProps {
  windowInstanceId: string;
  title?: string | null;
  /** Optional initial adapter. Defaults to mock project. */
  adapter?: FilesystemAdapter;
  process?: ProcessAdapter;
  /** Explicit right-slot override. When omitted, the default chat surface is
   *  used (set `hideChat` to hide it entirely). */
  rightSlot?: React.ReactNode;
  /** Explicit far-right-slot override. When omitted, the default chat history
   *  surface is used (set `hideHistory` to hide it entirely). */
  farRightSlot?: React.ReactNode;
  hideChat?: boolean;
  hideHistory?: boolean;
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
  hideChat,
  hideHistory,
  onClose,
}: CodeWorkspaceWindowProps) {
  const handleCollectData = useCallback(() => {
    // Ephemeral window — we persist geometry via WindowPanel but don't need to
    // checkpoint the workspace state itself (that lives in Redux already).
    return {};
  }, []);

  const resolvedRight =
    rightSlot ?? (hideChat ? undefined : <ChatPanelSlot basePath="/code" />);
  const resolvedFarRight =
    farRightSlot ?? (hideHistory ? undefined : <ChatHistorySlot />);

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
          rightSlot={resolvedRight}
          farRightSlot={resolvedFarRight}
        />
      </div>
    </WindowPanel>
  );
}

export default CodeWorkspaceWindow;
