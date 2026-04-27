"use client";

import { Separator, type SeparatorProps } from "react-resizable-panels";
import { cn } from "@/styles/themes/utils";

// Orientation-aware Separator wrapper used by every demo.
// Reads aria-orientation (set by the lib based on parent Group orientation):
//   - vertical Separator (in horizontal group)   → 0.5 wide bar, col-resize cursor
//   - horizontal Separator (in vertical group)   → 0.5 tall bar, row-resize cursor
// Required: focus:outline-none to suppress the browser's default focus outline,
// plus state classes for hover / active / dragging so the bar paints in primary
// at all interaction states (skipping `active` causes a "click reveals a white
// line" bug in dark mode — see SKILL.md §1).
export function Handle({ className, ...props }: SeparatorProps) {
  return (
    <Separator
      {...props}
      className={cn(
        "bg-border focus:outline-none transition-colors",
        "data-[separator=hover]:bg-primary",
        "data-[separator=active]:bg-primary",
        "data-[separator=dragging]:bg-primary",
        "[&[aria-orientation=vertical]]:w-0.5 [&[aria-orientation=vertical]]:cursor-col-resize",
        "[&[aria-orientation=horizontal]]:h-0.5 [&[aria-orientation=horizontal]]:cursor-row-resize",
        className,
      )}
    />
  );
}
