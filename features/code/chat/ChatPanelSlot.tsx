"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { AgentRunnerPage } from "@/features/agents/components/run/AgentRunnerPage";
import { SidePanelHeader } from "../views/SidePanelChrome";
import { AgentPicker } from "./AgentPicker";

interface ChatPanelSlotProps {
  /** Base path used by header controls inside the runner. Defaults to the
   *  current `/code` route so in-panel navigation stays inside the workspace. */
  basePath?: string;
  className?: string;
}

/**
 * Right-slot host for the conversational agent surface. Reads `?agentId=`
 * from the URL and mounts `AgentRunnerPage` when an agent is selected,
 * otherwise shows an inline picker. Pure UI-level composition — no Redux
 * state owned here.
 */
export const ChatPanelSlot: React.FC<ChatPanelSlotProps> = ({
  basePath = "/code",
  className,
}) => {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");

  return (
    <div className={`flex h-full min-h-0 flex-col ${className ?? ""}`}>
      <SidePanelHeader
        title="Chat"
        actions={<AgentPicker variant="inline" />}
      />
      <div className="min-h-0 flex-1">
        {agentId ? (
          <AgentRunnerPage
            agentId={agentId}
            basePath={basePath}
            backHref={basePath}
          />
        ) : (
          <AgentPicker variant="empty-state" />
        )}
      </div>
    </div>
  );
};

export default ChatPanelSlot;
