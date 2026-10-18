"use client";

/**
 * The one top row every Studio pane starts with: 36px, a hairline under it, so the three panes'
 * hairlines line up across the page. Holds the pane's switch or label on the left and its quiet
 * controls on the right; never a sentence.
 */

import { cn } from "@/lib/utils";

export function PaneBar({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-studio-pane-bar=""
      className={cn("flex h-9 shrink-0 items-center gap-2 border-b border-border px-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** A pane's name, when the pane has no switch of its own. */
export function PaneLabel({ children }: { children: React.ReactNode }) {
  return <span className="truncate px-1 text-xs font-medium text-muted-foreground">{children}</span>;
}
