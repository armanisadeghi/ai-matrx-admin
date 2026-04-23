"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectActiveSection } from "../redux/ui";
import { OverviewSection } from "./sections/OverviewSection";
import { AgentsSection } from "./sections/AgentsSection";
import { SkillsSection } from "./sections/SkillsSection";
import { RenderBlocksSection } from "./sections/RenderBlocksSection";
import { ResourcesSection } from "./sections/ResourcesSection";
import { InstructionsSection } from "./sections/InstructionsSection";
import { PromptsSection } from "./sections/PromptsSection";
import { HooksSection } from "./sections/HooksSection";
import { McpServersSection } from "./sections/McpServersSection";
import { PluginsSection } from "./sections/PluginsSection";

export function AgentConnectionsBody() {
  const section = useAppSelector(selectActiveSection);
  switch (section) {
    case "overview":
      return <OverviewSection />;
    case "agents":
      return <AgentsSection />;
    case "skills":
      return <SkillsSection />;
    case "renderBlocks":
      return <RenderBlocksSection />;
    case "resources":
      return <ResourcesSection />;
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
