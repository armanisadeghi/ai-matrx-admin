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

export function FetchProgress({ label, progress, startedAt }: { label: string; progress: DataFetchProgress | null; startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const share = progress?.current != null && progress.total ? Math.min(1, progress.current / progress.total) : null;
  return (
    <div className="m-auto flex w-full max-w-sm flex-col items-center gap-3 py-8 text-center" aria-live="polite" data-fetch-progress="">
      <Spinner className="h-6 w-6 text-primary" />
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground">
        {progress?.label ?? "Starting"}
        {progress?.current != null && progress.total != null ? ` · ${progress.current} of ${progress.total}` : ""}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full origin-left bg-primary", share == null && "animate-pulse")} style={{ transform: `scaleX(${share ?? 0.15})` }} />
      </div>
      <div className="text-[11px] text-muted-foreground">{formatDurationMs(Math.max(0, now - startedAt))} · Keeps going if you leave</div>
    </div>
  );
}
