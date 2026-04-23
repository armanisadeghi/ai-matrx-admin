"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ActivityBarIconProps {
  label: string;
  icon: LucideIcon;
  active: boolean;
  shortcut?: string;
  onClick: () => void;
}

export const ActivityBarIcon: React.FC<ActivityBarIconProps> = ({
  label,
  icon: Icon,
  active,
  shortcut,
  onClick,
}) => {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            className={cn(
              "group relative flex h-12 w-12 items-center justify-center text-neutral-500 transition-colors",
              "hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
              active && "text-neutral-900 dark:text-neutral-50",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-blue-500 opacity-0 transition-opacity",
                active && "opacity-100",
              )}
            />
            <Icon size={22} strokeWidth={1.6} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
          {shortcut ? (
            <span className="ml-2 font-mono text-neutral-400">{shortcut}</span>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
