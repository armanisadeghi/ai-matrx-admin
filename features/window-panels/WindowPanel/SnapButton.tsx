"use client";

/**
 * SnapButton — small grid tile used inside the green-traffic-light dropdown
 * for snap-to-edge and arrange-all actions. Extracted from WindowPanel.tsx
 * Phase 6 (decomposition) — purely presentational, no shared state.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SnapButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  wide?: boolean;
}

export function SnapButton({ label, icon, onClick, wide }: SnapButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center justify-center rounded-lg p-1.5",
        "bg-muted/60 hover:bg-accent border border-border/50",
        "transition-colors text-foreground/70",
        wide ? "col-span-2" : "col-span-1",
      )}
    >
      {icon}
    </button>
  );
}
