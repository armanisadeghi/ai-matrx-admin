/**
 * features/files/components/surfaces/dropbox/FilterChips.tsx
 *
 * "Recents" and "Starred" pill chips shown above the file table. Toggling a
 * chip rewrites the URL or calls the supplied handler — the shell owns
 * the state.
 */

"use client";

import { Clock, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterChipKey = "recents" | "starred";

export interface FilterChipsProps {
  active: FilterChipKey | null;
  onToggle: (key: FilterChipKey) => void;
  className?: string;
}

const CHIPS: { key: FilterChipKey; label: string; icon: LucideIcon }[] = [
  { key: "recents", label: "Recents", icon: Clock },
  { key: "starred", label: "Starred", icon: Star },
];

export function FilterChips({ active, onToggle, className }: FilterChipsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {CHIPS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:bg-accent",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
