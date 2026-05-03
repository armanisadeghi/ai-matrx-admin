"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function ColumnEmptyState({
  icon: Icon,
  title,
  description,
  className,
}: ColumnEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center",
        className,
      )}
    >
      <Icon className="h-6 w-6 text-muted-foreground/50" />
      <p className="text-xs font-medium text-foreground/80">{title}</p>
      {description && (
        <p className="max-w-[24ch] text-[10px] text-muted-foreground/80">
          {description}
        </p>
      )}
    </div>
  );
}
