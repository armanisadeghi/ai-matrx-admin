"use client";

import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

/**
 * Wraps a TapTargetButton (or any tap control) like the button-demo page:
 * no extra padding on the control — only `gap-0.5` before the caption.
 * Tooltip shows the full `label`; the caption truncates at max-w-[52px].
 */
export function TapTargetLabeled({
  label,
  children,
  hideLabel = false,
  toolTipSide = "bottom",
}: {
  label: string;
  children: React.ReactNode;
  hideLabel?: boolean;
  toolTipSide?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center p-0 gap-0 space-y-0 space-x-0 shrink-0">
            {children}
            {!hideLabel && (
              <span className="text-[10px] text-muted-foreground/70 leading-tight max-w-[52px] text-center truncate">
                {label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side={toolTipSide}>
          <span className="font-mono text-xs max-w-[280px] break-all">
            {label}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
