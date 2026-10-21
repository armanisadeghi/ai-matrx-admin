// features/auth/components/module-landing/ModuleDoors.tsx
//
// A grid of doors — one card per real page, icon + label + one-line hint.
// Shared by ModulePromiseSurface ("what works today") and module hubs such as
// /memory, so a door looks and behaves the same everywhere.

import NavLink from "@/components/navigation/NavLink";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export interface ModuleDoor {
  href: string;
  label: string;
  /** One line, ≤60 chars — every door carries one. */
  hint: string;
  icon: LucideIcon;
}

export function ModuleDoors({ doors, className }: { doors: ModuleDoor[]; className?: string }) {
  return (
    <ul className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className ?? ""}`}>
      {doors.map((door) => {
        const DoorIcon = door.icon;
        return (
          <li key={door.href}>
            <NavLink
              href={door.href}
              className="group flex min-h-11 items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                <DoorIcon className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{door.label}</div>
                <div className="truncate text-xs text-muted-foreground">{door.hint}</div>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}
