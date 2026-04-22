import {
  Home,
  Hexagon,
  Lightbulb,
  BookOpen,
  Bookmark,
  Zap,
  Server,
  Plug,
} from "lucide-react";
import type { OverviewCard, SidebarSection } from "./types";

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  { value: "overview", label: "Overview", icon: Home },
  { value: "agents", label: "Agents", icon: Hexagon, count: 8 },
  { value: "skills", label: "Skills", icon: Lightbulb, count: 25 },
  { value: "instructions", label: "Instructions", icon: BookOpen },
  { value: "prompts", label: "Prompts", icon: Bookmark, count: 1 },
  { value: "hooks", label: "Hooks", icon: Zap, count: 5 },
  { value: "mcpServers", label: "MCP Servers", icon: Server, count: 8 },
  { value: "plugins", label: "Plugins", icon: Plug },
];

export const OVERVIEW_CARDS: OverviewCard[] = [
  {
    value: "agents",
    label: "Agents",
    icon: Hexagon,
    description:
      "Define custom agents with specialized personas, tool access, and instructions for specific tasks.",
    action: "new",
  },
  {
    value: "skills",
    label: "Skills",
    icon: Lightbulb,
    description:
      "Create reusable skill files that provide domain-specific knowledge and workflows.",
    action: "new",
  },
  {
    value: "instructions",
    label: "Instructions",
    icon: BookOpen,
    description:
      "Set always-on instructions that guide AI behavior across your workspace or user profile.",
    action: "new",
  },
  {
    value: "hooks",
    label: "Hooks",
    icon: Zap,
    description:
      "Configure automated actions triggered by events like saving files or running tasks.",
    action: "new",
  },
  {
    value: "mcpServers",
    label: "MCP Servers",
    icon: Server,
    description:
      "Connect external tool servers that extend AI capabilities with custom tools and data sources.",
    action: "browse",
  },
  {
    value: "plugins",
    label: "Plugins",
    icon: Plug,
    description:
      "Install and manage agent plugins that add additional tools, skills, and integrations.",
    action: "browse",
  },
];
