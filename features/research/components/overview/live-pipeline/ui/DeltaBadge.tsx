"use client";

import { cn } from "@/lib/utils";

interface Props {
  delta: "new" | "changed" | "stale";
  className?: string;
}

const CONFIG = {
  new: {
    label: "NEW",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40",
  },
  changed: {
    label: "CHANGED",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40",
  },
  stale: {
    label: "STALE",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/40",
  },
} as const;

export function DeltaBadge({ delta, className }: Props) {
  const cfg = CONFIG[delta];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1 py-px text-[8px] font-semibold tracking-wider",
        cfg.className,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
