"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import type { ModalNavItem } from "../types";

interface ModalNavListProps {
  items: ModalNavItem[];
  activeId: string | null;
  onSelect: (item: ModalNavItem) => void;
  showChevrons?: boolean;
  spacing?: "default" | "tight" | "list";
}

export function ModalNavList({
  items,
  activeId,
  onSelect,
  showChevrons,
  spacing = "default",
}: ModalNavListProps) {
  return (
    <nav className={cn("flex flex-col", spacing === "list" && "gap-3")}
         aria-label="Settings sections">
      {items.map((item, idx) => {
        const Icon = item.icon;
        const active = activeId === item.id;
        const isFirstInGroup = spacing === "list" && idx > 0;
        const card = spacing === "list";
        return (
          <div key={item.id} className={cn(card && "rounded-lg overflow-hidden bg-[#202c33]")}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className={cn(
                "flex w-full items-center gap-3 text-left transition-colors",
                spacing === "default" && "rounded-md px-3 py-2.5",
                spacing === "tight" && "px-3 py-2",
                spacing === "list" && "px-4 py-3.5",
                !card &&
                  (active
                    ? "bg-[#2a3942] text-[#e9edef]"
                    : "text-[#e9edef] hover:bg-[#202c33]"),
                card && "hover:bg-[#2a3942]",
                item.destructive && "text-[#f15c6d]",
              )}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    item.destructive ? "text-[#f15c6d]" : "text-[#aebac1]",
                  )}
                  strokeWidth={1.75}
                />
              ) : null}
              <span className="flex-1 truncate text-[15px]">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-[#25d366] px-2 py-0.5 text-[11px] font-semibold text-[#0b141a]">
                  {item.badge}
                </span>
              ) : null}
              {(showChevrons || item.children) && !item.destructive ? (
                <ChevronRight className="h-4 w-4 text-[#8696a0]" aria-hidden />
              ) : null}
            </button>
            {/* divider between cards is handled by gap on parent */}
          </div>
        );
      })}
    </nav>
  );
}
