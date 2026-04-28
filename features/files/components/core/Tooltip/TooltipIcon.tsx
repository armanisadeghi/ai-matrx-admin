/**
 * features/files/components/core/Tooltip/TooltipIcon.tsx
 *
 * Thin wrapper around Radix Tooltip — wraps a single icon button child and
 * shows a styled tooltip on hover. The app's TooltipProvider is mounted at
 * the root (Providers / PublicProviders / EntityProviders) so this works
 * anywhere.
 */

"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface TooltipIconProps {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactElement;
}

export function TooltipIcon({
  label,
  side = "bottom",
  children,
}: TooltipIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
