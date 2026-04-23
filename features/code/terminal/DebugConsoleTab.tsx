"use client";

import React from "react";
import { Bug } from "lucide-react";
import { cn } from "@/lib/utils";

interface DebugConsoleTabProps {
  className?: string;
}

export const DebugConsoleTab: React.FC<DebugConsoleTabProps> = ({
  className,
}) => (
  <div
    className={cn(
      "flex h-full items-center justify-center bg-white text-neutral-500 dark:bg-[#181818] dark:text-neutral-400",
      className,
    )}
  >
    <div className="flex flex-col items-center gap-2 text-center">
      <Bug size={28} strokeWidth={1.2} />
      <p className="text-xs">No active debug session.</p>
      <p className="text-[11px] text-neutral-400">
        Attaching a debugger to the sandbox will populate this view.
      </p>
    </div>
  </div>
);
