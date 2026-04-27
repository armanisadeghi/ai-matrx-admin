/**
 * features/files/components/surfaces/dropbox/ViewModeToggle.tsx
 *
 * Grid / List / Columns view switcher — reads from and writes to the shared
 * `cloudFiles.ui.viewMode` redux state.
 */

"use client";

import { Grid3x3, List } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectViewMode } from "@/features/files/redux/selectors";
import { setViewMode } from "@/features/files/redux/slice";
import type { ViewMode } from "@/features/files/types";
import { TooltipIcon } from "@/features/files/components/core/Tooltip/TooltipIcon";

// `columns` is intentionally omitted — there's no Columns view renderer in
// PageShell, so showing the icon previously did nothing on click. Re-enable
// once a Miller-columns view ships.
const OPTIONS: { mode: ViewMode; icon: LucideIcon; label: string }[] = [
  { mode: "list", icon: List, label: "List view" },
  { mode: "grid", icon: Grid3x3, label: "Grid view" },
];

export interface ViewModeToggleProps {
  className?: string;
}

export function ViewModeToggle({ className }: ViewModeToggleProps) {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector(selectViewMode);
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className={cn(
        "inline-flex items-center rounded-md border bg-background p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ mode, icon: Icon, label }) => {
        const active = viewMode === mode;
        return (
          <TooltipIcon key={mode} label={label}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              onClick={() => dispatch(setViewMode(mode))}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </TooltipIcon>
        );
      })}
    </div>
  );
}
