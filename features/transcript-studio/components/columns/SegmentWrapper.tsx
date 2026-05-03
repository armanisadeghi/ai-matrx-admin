"use client";

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ColumnId } from "../../constants";

interface SegmentWrapperProps {
  /** Owning column for sync-scroll registration. */
  column: ColumnId;
  tStart: number;
  tEnd: number;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Common wrapper for any segment rendered in a studio column.
 *
 * The `data-tstart` / `data-tend` attributes are the load-bearing markers
 * for synchronized scrolling (Phase 4). Phase 3 just sets them; the
 * `useScrollSync` hook reads them when the leader column writes the
 * cursor time.
 *
 * The `data-active` attribute lets columns highlight the segment that
 * matches the current cursorTime without forcing a full re-render of the
 * content tree — the parent flips the attribute and CSS responds.
 */
export function SegmentWrapper({
  column,
  tStart,
  tEnd,
  active,
  className,
  style,
  children,
}: SegmentWrapperProps) {
  return (
    <div
      data-studio-segment="true"
      data-column={column}
      data-tstart={tStart}
      data-tend={tEnd}
      data-active={active ? "true" : undefined}
      className={cn(
        "border-l-2 border-transparent px-3 py-1.5 text-sm leading-snug transition-colors",
        active && "border-primary/70 bg-primary/5",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
