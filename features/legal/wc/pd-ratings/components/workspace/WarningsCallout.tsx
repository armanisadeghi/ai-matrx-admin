"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WarningsCalloutProps {
  warnings: string[];
  className?: string;
}

export function WarningsCallout({ warnings, className }: WarningsCalloutProps) {
  if (!warnings.length) return null;
  return (
    <div
      className={cn(
        "rounded-md border border-amber-300/40 bg-amber-50/70 px-3 py-2",
        "dark:border-amber-500/30 dark:bg-amber-500/[0.06]",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <ul className="space-y-0.5 text-xs leading-relaxed text-amber-900 dark:text-amber-100">
          {warnings.map((warning, idx) => (
            <li key={idx}>{warning}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
