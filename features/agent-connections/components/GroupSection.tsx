"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupSectionProps {
  label: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function GroupSection({
  label,
  count,
  children,
  defaultOpen = true,
}: GroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 px-4 py-2 text-sm font-medium",
          "bg-muted/50 hover:bg-muted/70 transition-colors",
          "border-y border-border text-foreground",
        )}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="flex-1 text-left">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {count}
        </span>
      </button>
      {open && <div className="flex flex-col">{children}</div>}
    </div>
  );
}

export default GroupSection;
