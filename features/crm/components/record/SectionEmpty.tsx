"use client";

import type { ReactNode } from "react";

/** Compact centered empty state for a section with no rows yet. */
export function SectionEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
