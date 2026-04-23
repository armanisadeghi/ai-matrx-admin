"use client";

import { cn } from "@/lib/utils";

export type SettingsGridProps = {
  /** Desktop column count. Defaults to 2. */
  columns?: 2 | 3;
  /** Gap size between cells. */
  gap?: "sm" | "md" | "lg";
  children: React.ReactNode;
};

const gapClass = {
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

const columnsClass = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
};

/**
 * Grid container for dense dashboards — e.g. 2-up stat cards, side-by-side pickers.
 * On mobile always stacks to a single column to keep controls readable.
 */
export function SettingsGrid({
  columns = 2,
  gap = "md",
  children,
}: SettingsGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 px-4 mb-4",
        columnsClass[columns],
        gapClass[gap],
      )}
    >
      {children}
    </div>
  );
}
