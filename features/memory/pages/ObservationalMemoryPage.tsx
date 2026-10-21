"use client";

// /memory/observational — the Memory Inspector (observational memory, per conversation)
// given a route. Wraps the canonical ObservationalMemoryWindow (its own conversation
// list + ObservationalMemoryCore) instead of copying it; `?conversation=<id>` preselects
// one conversation.

import { Eye } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { useOpenObservationalMemoryWindow } from "@/features/overlays/definitions/observationalMemoryWindow.overlay";
import { MemoryPageFrame } from "./MemoryPageFrame";

export function ObservationalMemoryPage() {
  const conversationId = useSearchParams().get("conversation");
  const open = useOpenObservationalMemoryWindow();
  return (
    <MemoryPageFrame name="Memory inspector">
      <EmptyState
        icon={<Eye />}
        title="Memory inspector"
        line="What a conversation remembers, what it cost, and every change."
        action={
          <Button
            variant="primary"
            icon={<Eye />}
            onClick={() => open({ initialSelectedConversationId: conversationId })}
          >
            Open inspector
          </Button>
        }
      />
    </MemoryPageFrame>
  );
}
