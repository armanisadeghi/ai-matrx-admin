"use client";

/**
 * A fetch in flight: the source, the server's stage words, a bar when it says how far, the time it
 * has taken. Shared by every Get data surface (the Data library's source panel; the board tile's
 * `GetDataBody` carries the same view and moves onto this one when its lane next touches it).
 */

import { useEffect, useState } from "react";
import { formatDurationMs } from "@ai-matrx/kit/format";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import type { DataFetchProgress } from "./contract";

export function FetchProgress({
  label,
  progress,
  startedAt,
  layout = "stack",
  typicalMs = null,
}: {
  label: string;
  progress: DataFetchProgress | null;
  startedAt: number;
  /** `row`: one line above results that fill in below it (the Data library's inline results). */
  layout?: "stack" | "row";
  /** How long this source usually takes (median of its finished runs): shown as a hint, and paces the bar when the server gives no count. */
  typicalMs?: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, now - startedAt);
  const counted = progress?.current != null && progress.total ? Math.min(1, progress.current / progress.total) : null;
  // No count from the server: pace the bar by the usual length (never full until it is done).
  const share = counted ?? (typicalMs ? Math.min(0.95, Math.max(0.05, elapsed / typicalMs)) : null);
  const usually = typicalMs ? `Usually about ${formatDurationMs(typicalMs)}` : null;
  const stage = `${progress?.label ?? "Starting"}${progress?.current != null && progress.total != null ? ` · ${progress.current} of ${progress.total}` : ""}`;
  if (layout === "row") {
    return (
      <div className="flex w-full flex-col gap-1.5" aria-live="polite" data-fetch-progress="row">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Spinner className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate font-medium text-foreground">{stage}</span>
          <span className="ml-auto shrink-0 text-muted-foreground">{[formatDurationMs(elapsed), usually, "Keeps going if you leave"].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full origin-left bg-primary", share == null && "animate-pulse")} style={{ transform: `scaleX(${share ?? 0.15})` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="m-auto flex w-full max-w-sm flex-col items-center gap-3 py-8 text-center" aria-live="polite" data-fetch-progress="">
      <Spinner className="h-6 w-6 text-primary" />
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground">{stage}</div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full origin-left bg-primary", share == null && "animate-pulse")} style={{ transform: `scaleX(${share ?? 0.15})` }} />
      </div>
      <div className="text-[11px] text-muted-foreground">{[formatDurationMs(elapsed), usually, "Keeps going if you leave"].filter(Boolean).join(" · ")}</div>
    </div>
  );
}
