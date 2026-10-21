"use client";

// /memory/agent-memory — the Agent Memory manager (chat.agent_memory) given a route.
// The canonical component is @ai-matrx/chat's AgentMemoryWindow; the package exports
// only the window, so this page opens THAT window instead of copying its sidebar and
// editor. Follow-up: export a page body from the package (MEMORY-DUPLICATES.md).

import { Brain } from "lucide-react";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { useOpenAgentMemoryWindow } from "@/features/overlays/definitions/agentMemoryWindow.overlay";
import { MemoryPageFrame } from "./MemoryPageFrame";

export function AgentMemoryPage() {
  const open = useOpenAgentMemoryWindow();
  return (
    <MemoryPageFrame name="Agent memories">
      <EmptyState
        icon={<Brain />}
        title="Agent memories"
        line="What your agents saved about you. Edit or remove any of it."
        action={
          <Button variant="primary" icon={<Brain />} onClick={() => open()}>
            Open memories
          </Button>
        }
      />
    </MemoryPageFrame>
  );
}
