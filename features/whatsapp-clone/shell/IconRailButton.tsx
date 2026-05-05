"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import { UnreadBadge } from "../shared/UnreadBadge";

interface IconRailButtonProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: number;
  hasIndicator?: boolean;
  onClick?: () => void;
}

export function IconRailButton({
  icon: Icon,
  label,
  active,
  badge,
  hasIndicator,
  onClick,
}: IconRailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-[#2a3942] text-white"
          : "text-[#aebac1] hover:bg-[#202c33] hover:text-white",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} />
      {hasIndicator ? (
        <span
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#25d366] ring-2 ring-[#161b22]"
          aria-hidden
        />
      ) : null}
      {badge && badge > 0 ? (
        <span className="absolute -right-1 -top-1">
          <UnreadBadge count={badge} />
        </span>
      ) : null}
    </button>
  );
}
