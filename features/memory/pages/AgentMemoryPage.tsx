"use client";

// /memory/agent-memory — the Agent Memory manager (chat.agent_memory) as a page.
// The body is @ai-matrx/chat's AgentMemoryPanel — the same list, editor and footer
// the floating Agent Memory window draws; the header action opens that window.

import { AppWindow } from "lucide-react";
import { AgentMemoryPanel } from "@ai-matrx/chat/agents/components/memory/AgentMemoryPanel";
import { useOpenAgentMemoryWindow } from "@/features/overlays/definitions/agentMemoryWindow.overlay";
import { MemoryPageFrame } from "./MemoryPageFrame";

export function AgentMemoryPage() {
  const open = useOpenAgentMemoryWindow();
  return (
    <MemoryPageFrame
      name="Agent memories"
      fill
      actions={[{ label: "Open as window", icon: AppWindow, onPress: () => open() }]}
    >
      <AgentMemoryPanel />
    </MemoryPageFrame>
  );
}
