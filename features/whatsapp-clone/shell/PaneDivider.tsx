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
        "bg-[#0b141a] data-[separator=hover]:bg-[#25d366]/40 data-[separator=active]:bg-[#25d366]",
        className,
      )}
    />
  );
}
