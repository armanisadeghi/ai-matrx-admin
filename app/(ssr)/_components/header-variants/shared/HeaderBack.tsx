"use client";

// HeaderBack — Glass back chevron button.
// Follows the same 44px tap-target / 30px glass-inner pattern.

import GlassButton from "./GlassButton";

interface HeaderBackProps {
  /** Click handler. If omitted, uses router.back() via the provided fallback. */
  onClick?: () => void;
}

export default function HeaderBack({ onClick }: HeaderBackProps) {
  const handleClick = onClick ?? (() => window.history.back());

  return (
    <GlassButton
      icon="ChevronLeft"
      onClick={handleClick}
      ariaLabel="Go back"
      iconSize={18}
    />
  );
}
