"use client";

// GlassButton — Header action button, delegates to IconButton.
// Kept as a thin wrapper so all existing header variants need no changes.

import IconButton from "@/features/shell/components/IconButton";
import LucideIcon from "./LucideIcon";

interface GlassButtonProps {
  icon?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  iconSize?: number;
  innerClassName?: string;
  /** unused — kept for API compat */
  asDiv?: boolean;
}

export default function GlassButton({
  icon,
  children,
  onClick,
  ariaLabel = "",
  iconSize = 16,
  innerClassName,
}: GlassButtonProps) {
  return (
    <IconButton
      icon={icon ? <LucideIcon name={icon} size={iconSize} /> : children}
      onClick={onClick}
      label={ariaLabel}
      glassClassName={innerClassName}
    />
  );
}
