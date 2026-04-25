"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

// EntityPack wrapper removed during entity-isolation Phase 3 — the
// `(legacy)/layout.tsx` group layout now mounts EntityProviders (which
// includes EntityPack) for the whole legacy branch.
export default function WorkflowEntityLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <div className="h-full w-full bg-textured transition-colors">
      <main className="h-full w-full">{children}</main>
    </div>
  );
}
