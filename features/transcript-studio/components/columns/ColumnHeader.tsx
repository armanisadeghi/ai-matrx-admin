"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ColumnHeaderProps {
  icon: LucideIcon;
  label: string;
  /** Small status text (e.g. "12 chunks · 3:42") rendered next to the title. */
  status?: string;
  /** State indicator rendered as a colored dot to the right of the label. */
  dotState?: "idle" | "live" | "running" | "error";
  /** Right-side actions (buttons, toggles). */
  actions?: ReactNode;
  className?: string;
}

const DOT_CLASS: Record<NonNullable<ColumnHeaderProps["dotState"]>, string> = {
  idle: "bg-muted-foreground/40",
  live: "bg-red-500 animate-pulse",
  running: "bg-blue-500 animate-pulse",
  error: "bg-destructive",
};

export function ColumnHeader({
  icon: Icon,
  label,
  status,
  dotState = "idle",
  actions,
  className,
}: ColumnHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/60 px-2.5 py-1.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/90">
          {label}
        </span>
        <span
          aria-hidden="true"
          className={cn("inline-block h-1.5 w-1.5 rounded-full", DOT_CLASS[dotState])}
        />
        {status && (
          <span className="truncate text-[10px] text-muted-foreground/80">
            {status}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
