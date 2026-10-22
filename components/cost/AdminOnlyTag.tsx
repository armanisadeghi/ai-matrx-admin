/**
 * components/cost/AdminOnlyTag.tsx — the visible "Admin only" tag every dollar figure outside the
 * admin site carries (owner ruling 2026-10-22: an admin sees dollars only inside an element that is
 * visibly labelled admin-only, "so I don't have a heart attack"). `<AdminCost>`, `<AdminUsd>`,
 * `<CostFigures>`, `<Cost>` (when it shows dollars) and `<CostDoor>` render it; wrap any other
 * admin-only cost block in `<AdminOnly>`.
 */

import { Badge } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";

export function AdminOnlyTag({ className }: { className?: string }) {
  return (
    <Badge variant="warning" className={cn("align-middle", className)} data-admin-only-tag="">
      Admin only
    </Badge>
  );
}

/** An admin-only block: the tag, then its children (a dollar line, a cost table). */
export function AdminOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)} data-admin-only="">
      <AdminOnlyTag />
      {children}
    </span>
  );
}
