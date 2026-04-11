"use client";

import React, { useState } from "react";
import { WindowPanel } from "../WindowPanel";
import { useAppDispatch } from "@/lib/redux/hooks";
import { Messages } from "@/features/agents/components/builder/message-builders/Messages";
import { AgentVariablesPanel } from "@/features/agents/components/variables-management/AgentVariablesPanel";
import { AgentToolsManager } from "@/features/agents/components/tools-management/AgentToolsManager";
import { Layers, MessageSquare, Variable, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentContentWindowProps {
  initialAgentId: string;
  initialTab?: "messages" | "variables" | "tools";
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AgentContentWindow({
  initialAgentId,
  initialTab = "messages",
  isOpen,
  onClose,
}: AgentContentWindowProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!initialAgentId) {
    return null;
  }

  return (
    <WindowPanel
      id="agent-content-window"
      title="Agent Content"
      onClose={onClose}
      width={1000}
      height={750}
      minWidth={600}
      minHeight={500}
      urlSyncKey="agent-content"
      urlSyncId="agent-content-window"
      urlSyncArgs={{ m: "ac" }}
      overlayId="agentContentWindow"
      onCollectData={() => ({ initialAgentId, activeTab })}
    >
      <div className="flex flex-col h-full bg-background min-w-0">
        <div className="flex border-b border-border lg:px-4 lg:py-2 px-2 py-1 gap-1 shrink-0 bg-muted/20">
          <Button
            variant={activeTab === "messages" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("messages")}
            className="flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Messages
          </Button>
          <Button
            variant={activeTab === "variables" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("variables")}
            className="flex items-center gap-2"
          >
            <Variable className="w-4 h-4" />
            Variables
          </Button>
          <Button
            variant={activeTab === "tools" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("tools")}
            className="flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Tools
          </Button>
        </div>

        <div className="flex-1 overflow-hidden w-full relative">
          {activeTab === "messages" && (
            <div className="p-4 h-full overflow-y-auto">
              <Messages agentId={initialAgentId} />
            </div>
          )}
          {activeTab === "variables" && (
            <AgentVariablesPanel agentId={initialAgentId} />
          )}
          {activeTab === "tools" && (
            <AgentToolsManager agentId={initialAgentId} />
          )}
        </div>
      </div>
    </WindowPanel>
  );
}
