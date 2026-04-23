"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProblemsTabProps {
  className?: string;
}

export const ProblemsTab: React.FC<ProblemsTabProps> = ({ className }) => (
  <div
    className={cn(
      "flex h-full items-center justify-center bg-white text-neutral-500 dark:bg-[#181818] dark:text-neutral-400",
      className,
    )}
  >
    <div className="flex flex-col items-center gap-2 text-center">
      <CheckCircle2 size={28} strokeWidth={1.2} className="text-emerald-500" />
      <p className="text-xs">No problems detected in the workspace.</p>
      <p className="text-[11px] text-neutral-400">
        Monaco diagnostics will flow in here in a future pass.
      </p>
    </div>
  </div>
);
