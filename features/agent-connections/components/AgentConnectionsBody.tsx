"use client";

import React from "react";
import type { AgentConnectionsSection } from "../types";
import { OverviewSection } from "./sections/OverviewSection";
import { AgentsSection } from "./sections/AgentsSection";
import { SkillsSection } from "./sections/SkillsSection";
import { InstructionsSection } from "./sections/InstructionsSection";
import { PromptsSection } from "./sections/PromptsSection";
import { HooksSection } from "./sections/HooksSection";
import { McpServersSection } from "./sections/McpServersSection";
import { PluginsSection } from "./sections/PluginsSection";

interface AgentConnectionsBodyProps {
  section: AgentConnectionsSection;
  onNavigate: (section: AgentConnectionsSection) => void;
}

export function AgentConnectionsBody({
  section,
  onNavigate,
}: AgentConnectionsBodyProps) {
  switch (section) {
    case "overview":
      return <OverviewSection onNavigate={onNavigate} />;
    case "agents":
      return <AgentsSection />;
    case "skills":
      return <SkillsSection />;
    case "instructions":
      return <InstructionsSection />;
    case "prompts":
      return <PromptsSection />;
    case "hooks":
      return <HooksSection />;
    case "mcpServers":
      return <McpServersSection />;
    case "plugins":
      return <PluginsSection />;
    default:
      return null;
  }
}

export default AgentConnectionsBody;
