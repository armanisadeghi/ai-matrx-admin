"use client";

import { cn } from "@/lib/utils";
import type { ItemStatus } from "../../../../hooks/usePipelineProgress";

const STATUS_CLASS: Record<ItemStatus, string> = {
  pending: "bg-muted-foreground/30",
  active: "bg-primary animate-pulse",
  success: "bg-green-500",
  partial: "bg-amber-500",
  failed: "bg-red-500",
  manual: "bg-indigo-500",
  skipped: "bg-muted-foreground/40",
  complete: "bg-blue-500",
  dead_link: "bg-zinc-500",
  gated: "bg-orange-500",
};

const STATUS_RING: Record<ItemStatus, string> = {
  pending: "ring-muted-foreground/20",
  active: "ring-primary/30",
  success: "ring-green-500/30",
  partial: "ring-amber-500/30",
  failed: "ring-red-500/30",
  manual: "ring-indigo-500/30",
  skipped: "ring-muted-foreground/20",
  complete: "ring-blue-500/30",
  dead_link: "ring-zinc-500/30",
  gated: "ring-orange-500/30",
};

interface Props {
  status: ItemStatus;
  size?: "sm" | "md";
  className?: string;
}

export function StatusDot({ status, size = "sm", className }: Props) {
  return (
    <span
      className={cn(
        "inline-block rounded-full ring-2",
        size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
        STATUS_CLASS[status],
        STATUS_RING[status],
        className,
      )}
    />
  );
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  pending: "Pending",
  active: "Active",
  success: "Success",
  partial: "Thin",
  failed: "Failed",
  manual: "Manual",
  skipped: "Skipped",
  complete: "Complete",
  dead_link: "Dead link",
  gated: "Gated",
};

export const STATUS_TEXT_CLASS: Record<ItemStatus, string> = {
  pending: "text-muted-foreground",
  active: "text-primary",
  success: "text-green-600 dark:text-green-400",
  partial: "text-amber-600 dark:text-amber-400",
  failed: "text-red-600 dark:text-red-400",
  manual: "text-indigo-600 dark:text-indigo-400",
  skipped: "text-muted-foreground",
  complete: "text-blue-600 dark:text-blue-400",
  dead_link: "text-zinc-600 dark:text-zinc-400 line-through",
  gated: "text-orange-600 dark:text-orange-400",
};
