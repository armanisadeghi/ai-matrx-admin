"use client";

// /memory/observational — the Memory Inspector (observational memory, per conversation).
// The body is @ai-matrx/chat's ObservationalMemoryPanel — the same conversation list and
// inspector the floating window draws; `?conversation=<id>` preselects one conversation.

import { AppWindow } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ObservationalMemoryPanel } from "@ai-matrx/chat/agents/components/observational-memory/ObservationalMemoryPanel";
import { useOpenObservationalMemoryWindow } from "@/features/overlays/definitions/observationalMemoryWindow.overlay";
import { MemoryPageFrame } from "./MemoryPageFrame";

export function ObservationalMemoryPage() {
  const conversationId = useSearchParams().get("conversation");
  const open = useOpenObservationalMemoryWindow();
  return (
    <MemoryPageFrame
      name="Memory inspector"
      fill
      actions={[
        {
          label: "Open as window",
          icon: AppWindow,
          onPress: () => open({ initialSelectedConversationId: conversationId }),
        },
      ]}
    >
      <ObservationalMemoryPanel initialConversationId={conversationId} />
    </MemoryPageFrame>
  );
}
