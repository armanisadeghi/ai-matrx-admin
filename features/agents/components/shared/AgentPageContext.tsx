"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { useAgentsBasePath } from "@/features/agents/hooks/useAgentsBasePath";
import type { DatabaseTool } from "@/utils/supabase/tools-service";

export type AgentPageMode = "edit" | "run";

interface AgentPageContextValue {
  agentId: string;
  agentName: string;
  availableTools: DatabaseTool[];
  basePath: string;
  mode: AgentPageMode;
}

const AgentPageCtx = createContext<AgentPageContextValue | null>(null);

export function useAgentPageContext(): AgentPageContextValue {
  const ctx = useContext(AgentPageCtx);
  if (!ctx) {
    throw new Error(
      "useAgentPageContext must be used within AgentPageProvider",
    );
  }
  return ctx;
}

interface AgentPageProviderProps {
  agentId: string;
  agentName: string;
  availableTools: DatabaseTool[];
  children: React.ReactNode;
}

export function AgentPageProvider({
  agentId,
  agentName,
  availableTools,
  children,
}: AgentPageProviderProps) {
  const basePath = useAgentsBasePath();
  const pathname = usePathname();
  const mode: AgentPageMode = pathname?.endsWith("/run") ? "run" : "edit";

  return (
    <AgentPageCtx.Provider
      value={{ agentId, agentName, availableTools, basePath, mode }}
    >
      {children}
    </AgentPageCtx.Provider>
  );
}
