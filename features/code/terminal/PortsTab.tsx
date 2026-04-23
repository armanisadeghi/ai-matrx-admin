"use client";

import React from "react";
import { Network } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortsTabProps {
  className?: string;
}

export const PortsTab: React.FC<PortsTabProps> = ({ className }) => (
  <div
    className={cn(
      "flex h-full items-center justify-center bg-white text-neutral-500 dark:bg-[#181818] dark:text-neutral-400",
      className,
    )}
  >
    <div className="flex flex-col items-center gap-2 text-center">
      <Network size={28} strokeWidth={1.2} />
      <p className="text-xs">No forwarded ports.</p>
      <p className="text-[11px] text-neutral-400">
        Exposed sandbox ports will appear here and link to preview URLs.
      </p>
    </div>
  </div>
);
