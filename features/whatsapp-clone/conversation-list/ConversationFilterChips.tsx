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
              ? "bg-[#103529] text-[#25d366]"
              : "bg-[#202c33] text-[#aebac1] hover:bg-[#2a3942]",
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
