"use client";

import React, { useCallback, useState } from "react";
import { Settings } from "lucide-react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import {
  AgentConnectionsSidebar,
  AgentConnectionsBody,
  type AgentConnectionsSection,
} from "@/features/agent-connections";

interface AgentConnectionsWindowProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: AgentConnectionsSection;
}

export default function AgentConnectionsWindow({
  isOpen,
  onClose,
  initialSection,
}: AgentConnectionsWindowProps) {
  if (!isOpen) return null;
  return (
    <AgentConnectionsWindowInner
      onClose={onClose}
      initialSection={initialSection}
    />
  );
}

function AgentConnectionsWindowInner({
  onClose,
  initialSection,
}: Omit<AgentConnectionsWindowProps, "isOpen">) {
  const [activeSection, setActiveSection] =
    useState<AgentConnectionsSection>(initialSection ?? "overview");

  const collectData = useCallback(
    (): Record<string, unknown> => ({ activeSection }),
    [activeSection],
  );

  const sidebarContent = (
    <AgentConnectionsSidebar
      activeSection={activeSection}
      onSelect={setActiveSection}
    />
  );

  const titleNode = (
    <span className="inline-flex items-center gap-1.5">
      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
      Agent Customizations
    </span>
  );

  return (
    <WindowPanel
      id="agent-connections-window"
      titleNode={titleNode}
      title="Agent Customizations"
      width={1100}
      height={720}
      minWidth={640}
      minHeight={420}
      position="center"
      onClose={onClose}
      sidebar={sidebarContent}
      sidebarDefaultSize={220}
      sidebarMinSize={180}
      sidebarClassName="bg-muted/10 border-r border-border"
      overlayId="agentConnectionsWindow"
      onCollectData={collectData}
      bodyClassName="bg-background"
    >
      <AgentConnectionsBody
        section={activeSection}
        onNavigate={setActiveSection}
      />
    </WindowPanel>
  );
}
