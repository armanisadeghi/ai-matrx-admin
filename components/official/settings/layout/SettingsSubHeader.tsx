"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsSubHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Renders a bottom border as a divider. Defaults to true. */
  divider?: boolean;
};

/**
 * Page-level header for a settings tab.
 * Render once at the top of each tab component — above any SettingsSection.
 */
export function SettingsSubHeader({
  title,
  description,
  icon: Icon,
  divider = true,
}: SettingsSubHeaderProps) {
  return (
    <div
      className={cn(
        "px-4 pb-4 mb-4",
        divider && "border-b border-border/40",
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-foreground" />}
        <h2 className="text-lg font-semibold text-foreground leading-tight">
          {title}
        </h2>
      </div>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
