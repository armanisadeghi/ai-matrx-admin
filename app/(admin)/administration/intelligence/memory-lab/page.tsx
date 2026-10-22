// Intelligence › Memory Lab: replay one person's chats through the memory agents into a sandbox
// store (chat.memory_trial). Plan: common-docs/systems/chat/agent-memory/projects/memory-v1/PLAN.md §4.
"use client";

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { TrialList } from "@/features/memory-lab/components/TrialList";

export default function MemoryLabPage() {
  return (
    <>
      <RecordPageHeader
        backHref="/administration/intelligence"
        parents={[{ label: "Intelligence", href: "/administration/intelligence" }]}
        level={{ name: "Memory Lab" }}
      />
      <TrialList />
    </>
  );
}
