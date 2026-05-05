"use client";

import { ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/styles/themes/utils";

interface PaneDividerProps {
  className?: string;
}

export function PaneDivider({ className }: PaneDividerProps) {
  return (
    <ResizableHandle
      className={cn(
        "bg-border data-[separator=hover]:bg-emerald-500/40 data-[separator=active]:bg-emerald-500",
        className,
      )}
    />
  );
}
