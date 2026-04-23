"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { HEADER_HEIGHT, PANE_BORDER, TEXT_HEADER } from "../styles/tokens";

interface SidePanelHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const SidePanelHeader: React.FC<SidePanelHeaderProps> = ({
  title,
  subtitle,
  actions,
}) => (
  <div
    className={cn(
      "flex shrink-0 items-center justify-between border-b px-3",
      HEADER_HEIGHT,
      PANE_BORDER,
    )}
  >
    <div className="flex min-w-0 items-baseline gap-2">
      <span className={TEXT_HEADER}>{title}</span>
      {subtitle && (
        <span className="truncate text-[11px] text-neutral-500">
          {subtitle}
        </span>
      )}
    </div>
    {actions && <div className="flex items-center gap-0.5">{actions}</div>}
  </div>
);

interface SidePanelActionProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export const SidePanelAction: React.FC<SidePanelActionProps> = ({
  icon: Icon,
  label,
  onClick,
  active,
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={cn(
      "flex h-6 w-6 items-center justify-center rounded-sm text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
      active &&
        "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50",
    )}
  >
    <Icon size={14} />
  </button>
);
