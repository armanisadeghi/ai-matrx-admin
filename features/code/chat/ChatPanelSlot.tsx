"use client";

import React, { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Settings2 } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { AgentRunnerPage } from "@/features/agents/components/run/AgentRunnerPage";
import { SidePanelHeader, SidePanelAction } from "../views/SidePanelChrome";
import { AVATAR_RESERVE } from "../styles/tokens";
import { AgentPicker } from "./AgentPicker";
import { useCodeWorkspaceHistory } from "./useCodeWorkspaceHistory";

interface ChatPanelSlotProps {
  /** Base path used by header controls inside the runner. Defaults to the
   *  current `/code` route so in-panel navigation stays inside the workspace. */
  basePath?: string;
  className?: string;
  /** When true, the top row reserves space for the app's floating avatar. */
  rightmost?: boolean;
}

const CODE_WORKSPACE_SETTINGS_TAB = "editor.codeWorkspace";

/**
 * Right-slot host for the conversational agent surface. Reads `?agentId=`
 * from the URL and mounts `AgentRunnerPage` when an agent is selected,
 * otherwise shows an inline picker. Pure UI-level composition — no Redux
 * state owned here.
 *
 * The inline / empty-state pickers are seeded with the user's saved
 * `coding.agentFilter` so the roster stays focused on coding agents; the
 * user can bypass the filter or open Settings directly from the picker.
 */
export const ChatPanelSlot: React.FC<ChatPanelSlotProps> = ({
  basePath = "/code",
  className,
  rightmost = false,
}) => {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");
  const { filter } = useCodeWorkspaceHistory();

  const openSettings = useCallback(() => {
    dispatch(
      openOverlay({
        overlayId: "userPreferencesWindow",
        data: { initialTabId: CODE_WORKSPACE_SETTINGS_TAB },
      }),
    );
  }, [dispatch]);

  // Code workspace lives at `/code?agentId=X` — no nested `/run` segment.
  // Override the runner's default URL builder so fork / retry navigation
  // stays inside the workspace and doesn't 404.
  const buildConversationUrl = useMemo(() => {
    if (!agentId) return undefined;
    return (conversationId: string) =>
      `/code?agentId=${encodeURIComponent(agentId)}&conversationId=${encodeURIComponent(
        conversationId,
      )}`;
  }, [agentId]);

  return (
    <div className={`flex h-full min-h-0 flex-col ${className ?? ""}`}>
      <SidePanelHeader
        title="Chat"
        actions={
          <div className="flex items-center gap-1">
            <AgentPicker
              variant="inline"
              filter={filter}
              settingsTabId={CODE_WORKSPACE_SETTINGS_TAB}
            />
            <SidePanelAction
              icon={Settings2}
              label="Chat settings"
              onClick={openSettings}
            />
          </div>
        }
        className={rightmost ? AVATAR_RESERVE : undefined}
      />
      <div className="min-h-0 flex-1">
        {agentId ? (
          <AgentRunnerPage
            agentId={agentId}
            basePath={basePath}
            backHref={basePath}
            buildConversationUrl={buildConversationUrl}
          />
        ) : (
          <AgentPicker
            variant="empty-state"
            filter={filter}
            settingsTabId={CODE_WORKSPACE_SETTINGS_TAB}
          />
        )}
      </div>
    </div>
  );
};

export default ChatPanelSlot;
