"use client";

import { useEffect, useRef, useState } from "react";
import { Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineState } from "../../../hooks/usePipelineProgress";

interface Props {
  state: PipelineState;
  isStreaming: boolean;
  etaSeconds: number | null;
  onCancel: () => void;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Top header for the live pipeline activity dashboard.
 * Shows elapsed timer (rAF-driven, isolated to avoid Redux/state thrash),
 * ETA estimate, and cancel/close controls.
 */
export function PipelineHeader({
  state,
  isStreaming,
  etaSeconds,
  onCancel,
  onClose,
}: Props) {
  const [tick, setTick] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isStreaming || !state.startedAt) return;
    let last = performance.now();
    const loop = (now: number) => {
      if (now - last >= 1000) {
        setTick((t) => t + 1);
        last = now;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [isStreaming, state.startedAt]);

  // Force the timer to re-evaluate on each tick.
  void tick;

  const elapsed =
    state.startedAt != null
      ? formatDuration((state.completedAt ?? Date.now()) - state.startedAt)
      : "00:00";

  const isComplete = state.completedAt != null && !isStreaming;
  const iterationLabel =
    state.iterationMode === "rebuild"
      ? "Rebuild"
      : state.iterationMode === "update"
        ? "Update"
        : null;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-gradient-to-r from-primary/8 via-card/40 to-transparent">
      <div className="flex items-center gap-2 min-w-0">
        <Rocket
          className={cn(
            "h-4 w-4 shrink-0",
            isStreaming ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span className="text-sm font-semibold">
          {isStreaming
            ? "Live Research Pipeline"
            : isComplete
              ? "Pipeline Complete"
              : "Pipeline"}
        </span>
        {iterationLabel && (
          <span className="text-[10px] font-medium px-1.5 py-px rounded-full bg-primary/15 text-primary">
            {iterationLabel}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] text-muted-foreground tabular-nums">
          elapsed{" "}
          <span className="font-mono text-foreground/80">{elapsed}</span>
        </span>
        {isStreaming && etaSeconds != null && etaSeconds > 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums hidden sm:inline">
            ETA{" "}
            <span className="font-mono text-foreground/80">
              {formatEta(etaSeconds)}
            </span>
          </span>
        )}
        {isStreaming ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 text-xs"
          >
            Cancel
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
