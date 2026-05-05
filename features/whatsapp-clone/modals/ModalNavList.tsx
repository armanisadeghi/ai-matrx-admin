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
    <nav
      className={cn("flex flex-col", spacing === "list" && "gap-3")}
      aria-label="Settings sections"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeId === item.id;
        const card = spacing === "list";
        return (
          <div
            key={item.id}
            className={cn(card && "overflow-hidden rounded-lg bg-muted")}
          >
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
                    ? "bg-accent text-foreground"
                    : "text-foreground hover:bg-accent/50"),
                card && "hover:bg-accent",
                item.destructive && "text-rose-500",
              )}
            >
              {Icon ? (
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    item.destructive
                      ? "text-rose-500"
                      : "text-muted-foreground",
                  )}
                  strokeWidth={1.75}
                />
              ) : null}
              <span className="flex-1 truncate text-[15px]">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
              {(showChevrons || item.children) && !item.destructive ? (
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
              ) : null}
            </button>
          </div>
        );
      })}
    </nav>
  );
}
