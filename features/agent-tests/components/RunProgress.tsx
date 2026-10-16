"use client";

import { Badge } from "@ai-matrx/design-system/controls";
import { VERDICT_META, VERDICT_ORDER, runStatusMeta } from "../verdicts";
import type { VerdictCounts } from "../types";

const BAR_TONE: Record<string, string> = {
  success: "bg-success",
  destructive: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
};

/**
 * A run's progress: one segmented bar (each verdict its own colour) plus the
 * counts. Never a spinner — while the run is live every finished result moves
 * the bar (the page re-reads the run while it is queued or running).
 */
export function RunProgress({
  counts,
  status,
}: {
  counts: VerdictCounts;
  status: string;
}) {
  const meta = runStatusMeta(status);
  const total = Math.max(counts.total, counts.done, 1);
  const segments = VERDICT_ORDER.filter((v) => (counts.byVerdict[v] ?? 0) > 0);
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="type-meta text-muted-foreground">
          {counts.done} of {counts.total || counts.done} results
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-1">
          {segments.map((verdict) => (
            <Badge key={verdict} tone={VERDICT_META[verdict].tone}>
              {VERDICT_META[verdict].label} {counts.byVerdict[verdict]}
            </Badge>
          ))}
        </span>
      </div>
      <div
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={counts.done}
        aria-label="Results finished"
      >
        {segments.map((verdict) => (
          <div
            key={verdict}
            className={
              BAR_TONE[VERDICT_META[verdict].tone] ?? "bg-muted-foreground"
            }
            style={{
              width: `${((counts.byVerdict[verdict] ?? 0) / total) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
