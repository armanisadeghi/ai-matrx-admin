"use client";

/**
 * RunValueGate — renders `children(resolved)` once a run value's by-reference
 * parts are loaded (MKT-167). Every surface that SHOWS a step's output, the run's
 * result or a delivered document goes through it, so a reference marker never
 * reaches a renderer or a copy action, and a large value is fetched only when
 * the surface is on screen.
 */

import type React from "react";
import { AlertTriangle } from "lucide-react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";

import { useRunValue } from "../hooks/useRunValue";

export function RunValueGate<T>({
  runId,
  value,
  children,
}: {
  runId: string;
  value: T;
  children: (resolved: T) => React.ReactNode;
}) {
  const state = useRunValue(runId, value);
  if (state.error) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate" title={state.error}>
          This saved output could not be loaded
        </span>
      </div>
    );
  }
  if (state.pending || state.value === null) {
    return value === null ? <>{children(value)}</> : <RegionSkeleton shape="rows" count={3} />;
  }
  return <>{children(state.value)}</>;
}
