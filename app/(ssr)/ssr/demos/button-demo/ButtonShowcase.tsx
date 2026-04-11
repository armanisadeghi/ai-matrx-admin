"use client";

import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

/**
 * Wraps any TapButton with a tooltip showing its aria-label on hover,
 * plus a permanent name label below for quick scanning.
 */
export function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-0.5">
            {children}
            <span className="text-[10px] text-muted-foreground/70 leading-tight max-w-[52px] text-center truncate">
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="font-mono">{label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
