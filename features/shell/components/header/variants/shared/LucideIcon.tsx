// header-variants/shared/LucideIcon.tsx
// Renders a Lucide icon dynamically from its string name.
// Uses the `icons` record export — no dynamic import, tree-shakes at build.

import { icons } from "lucide-react";

interface LucideIconProps {
  /** Icon name exactly as exported by lucide-react, e.g. "ChevronLeft", "Plus" */
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function LucideIcon({
  name,
  size = 16,
  className,
  strokeWidth = 2,
}: LucideIconProps) {
  const IconComponent = icons[name as keyof typeof icons];
  if (!IconComponent) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[LucideIcon] Unknown icon name: "${name}"`);
    }
    return null;
  }
  return <IconComponent size={size} className={className} strokeWidth={strokeWidth} />;
}
