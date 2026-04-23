"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidePanelHeader } from "./SidePanelChrome";

interface PlaceholderPanelProps {
  title: string;
  icon: LucideIcon;
  description: string;
  className?: string;
}

export const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({
  title,
  icon: Icon,
  description,
  className,
}) => (
  <div className={cn("flex h-full min-h-0 flex-col", className)}>
    <SidePanelHeader title={title} />
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-neutral-500 dark:text-neutral-400">
      <Icon size={36} strokeWidth={1.2} />
      <div className="text-sm">{description}</div>
      <div className="text-xs text-neutral-400 dark:text-neutral-500">
        Coming soon.
      </div>
    </div>
  </div>
);
