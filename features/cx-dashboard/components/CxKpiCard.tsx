"use client";

import { cn } from "@/styles/themes/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
  onClick?: () => void;
};

export function CxKpiCard({ label, value, subValue, icon: Icon, trend, className, onClick }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-card p-3 min-w-0",
        onClick && "cursor-pointer hover:border-primary/40 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0 p-2 rounded-md bg-muted">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold leading-tight truncate">{value}</p>
        {subValue && (
          <p className={cn(
            "text-xs",
            trend === "up" && "text-emerald-500",
            trend === "down" && "text-red-500",
            (!trend || trend === "neutral") && "text-muted-foreground"
          )}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}
