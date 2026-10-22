"use client";

// The signed-in body of /memory/my-memory — your memory files (users.user_memory), the same
// MemoryManager the Settings › AI › Memory tab renders; Settings keeps its tab.
import { Suspense } from "react";
import { Settings } from "lucide-react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import MemoryManager from "@/features/memory/components/MemoryManager";
import { MemoryPageFrame } from "@/features/memory/pages/MemoryPageFrame";

export function MyMemoryPage() {
  return (
    <MemoryPageFrame
      name="My memory"
      wide
      actions={[{ label: "Memory settings", icon: Settings, href: "/user-settings/ai/memory", showLabel: true }]}
    >
      <Suspense fallback={<RegionSkeleton shape="rows" count={6} />}>
        <MemoryManager asSurface />
      </Suspense>
    </MemoryPageFrame>
  );
}
