"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListRowProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  status?: {
    label: string;
    tone?: "default" | "stopped" | "running" | "error";
  };
  onClick?: () => void;
}

export function ListRow({ icon: Icon, title, subtitle, status, onClick }: ListRowProps) {
  const statusClasses =
    status?.tone === "running"
      ? "bg-emerald-500/15 text-emerald-500"
      : status?.tone === "error"
        ? "bg-red-500/15 text-red-500"
        : "bg-sky-500/20 text-sky-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 px-4 py-2.5 text-left w-full",
        "hover:bg-muted/40 transition-colors",
        "border-b border-border/40 last:border-b-0",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      {status && (
        <span
          className={cn(
            "shrink-0 inline-flex items-center h-5 px-2 rounded-full text-xs font-medium",
            statusClasses,
          )}
        >
          {status.label}
        </span>
      )}
    </button>
  );
}

export default ListRow;
