"use client";

// GlassButton — The atomic tap-target unit for every header interaction.
//
// Enforces the two-layer principle:
//   Outer: 44×44 transparent tap target (2.75rem)
//   Inner: 30×30 glass-morphic visible pill (1.875rem)
//
// Usage:
//   <GlassButton icon="Plus" onClick={handler} />
//   <GlassButton onClick={handler}><CustomChild /></GlassButton>

import LucideIcon from "./LucideIcon";

interface GlassButtonProps {
  /** Lucide icon name — mutually exclusive with children */
  icon?: string;
  /** Custom content inside the glass pill */
  children?: React.ReactNode;
  /** Click / tap handler */
  onClick?: () => void;
  /** Accessible label (required when using icon) */
  ariaLabel?: string;
  /** Icon stroke width */
  iconSize?: number;
  /** Additional class on the glass inner */
  innerClassName?: string;
  /** If true, renders as a link-style element (no button semantics) */
  asDiv?: boolean;
}

export default function GlassButton({
  icon,
  children,
  onClick,
  ariaLabel,
  iconSize = 16,
  innerClassName = "",
  asDiv,
}: GlassButtonProps) {
  const Tag = asDiv ? "div" : "button";

  return (
    <Tag
      onClick={onClick}
      aria-label={ariaLabel}
      className="hdr-glass-btn"
      type={asDiv ? undefined : "button"}
    >
      <span className={`hdr-glass-btn-inner shell-glass shell-tactile ${innerClassName}`}>
        {icon && <LucideIcon name={icon} size={iconSize} />}
        {children}
      </span>
    </Tag>
  );
}
