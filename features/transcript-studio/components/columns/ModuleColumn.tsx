"use client";

import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnEmptyState } from "./ColumnEmptyState";
import { ColumnHeader } from "./ColumnHeader";

interface ModuleColumnProps {
  sessionId: string;
  className?: string;
}

/**
 * Phase 4 placeholder. The module registry, default `tasks` module, and the
 * `BlockRenderer` dispatch land in Phase 7. The column is intentionally
 * pluggable — this is just the empty surface.
 */
export function ModuleColumn({ className }: ModuleColumnProps) {
  return (
    <section
      className={cn("flex h-full min-h-0 flex-col bg-background", className)}
      aria-label="Module"
    >
      <ColumnHeader
        icon={ListChecks}
        label="Module"
        status="tasks · phase 7"
        dotState="idle"
      />
      <ColumnEmptyState
        icon={ListChecks}
        title="Pluggable Column 4"
        description="Tasks by default. Switchable to flashcards, decisions, or quiz. Lands in Phase 7."
      />
    </section>
  );
}
