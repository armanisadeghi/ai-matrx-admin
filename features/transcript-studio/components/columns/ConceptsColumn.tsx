"use client";

import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnEmptyState } from "./ColumnEmptyState";
import { ColumnHeader } from "./ColumnHeader";

interface ConceptsColumnProps {
  sessionId: string;
  className?: string;
}

/**
 * Phase 4 placeholder — concept extraction lands in Phase 6. Sparser than
 * Column 1/2 by design (handful of items per long session), so misalignment
 * with the other columns is expected and handled by the scroll-sync provider.
 */
export function ConceptsColumn({ className }: ConceptsColumnProps) {
  return (
    <section
      className={cn("flex h-full min-h-0 flex-col bg-background", className)}
      aria-label="Concepts"
    >
      <ColumnHeader
        icon={Lightbulb}
        label="Concepts"
        status="phase 6"
        dotState="idle"
      />
      <ColumnEmptyState
        icon={Lightbulb}
        title="Concept extraction every 200s"
        description="Themes, entities, and key questions surface here. Lands in Phase 6."
      />
    </section>
  );
}
