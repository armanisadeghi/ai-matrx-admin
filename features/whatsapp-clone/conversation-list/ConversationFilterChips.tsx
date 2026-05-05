"use client";

import { cn } from "@/styles/themes/utils";

export type FilterKey = "all" | "unread" | "favorites" | "groups";

interface ConversationFilterChipsProps {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
}

const CHIPS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "favorites", label: "Favourites" },
  { key: "groups", label: "Groups" },
];

export function ConversationFilterChips({
  active,
  onChange,
}: ConversationFilterChipsProps) {
  return (
    <div className="flex items-center gap-2 px-3 pb-2">
      {CHIPS.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(chip.key)}
          className={cn(
            "h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors",
            active === chip.key
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
