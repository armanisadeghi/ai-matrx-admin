"use client";

// A door that opens a window in place instead of a page. One action today: the ⌘K
// "Search your knowledge" bar.

import type { ReactNode } from "react";
import { useOpenKnowledgeCommandBar } from "@/features/overlays/definitions/knowledgeCommandBar.overlay";

export type ModuleDoorAction = "open-knowledge-search";

export function ModuleActionDoor({
  action,
  className,
  children,
}: {
  action: ModuleDoorAction;
  className?: string;
  children: ReactNode;
}) {
  const openSearch = useOpenKnowledgeCommandBar();
  return (
    <button
      type="button"
      className={`w-full text-left ${className ?? ""}`}
      data-door-action={action}
      onClick={() => openSearch()}
    >
      {children}
    </button>
  );
}
