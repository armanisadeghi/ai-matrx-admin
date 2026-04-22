import type { LucideIcon } from "lucide-react";

export type AgentConnectionsSection =
  | "overview"
  | "agents"
  | "skills"
  | "instructions"
  | "prompts"
  | "hooks"
  | "mcpServers"
  | "plugins";

export interface SidebarSection {
  value: AgentConnectionsSection;
  label: string;
  icon: LucideIcon;
  count?: number;
}

export interface OverviewCard {
  value: AgentConnectionsSection;
  label: string;
  icon: LucideIcon;
  description: string;
  action: "new" | "browse";
}

export interface SectionGroup<T> {
  key: string;
  label: string;
  items: T[];
}

export interface SkillEntry {
  id: string;
  name: string;
  description: string;
}

export interface AgentEntry {
  id: string;
  name: string;
  filename: string;
  description?: string;
}

export interface HookEntry {
  id: string;
  name: string;
  filename: string;
}

export type McpServerStatus = "running" | "stopped" | "error";

export interface McpServerEntry {
  id: string;
  name: string;
  description: string;
  status?: McpServerStatus;
}
