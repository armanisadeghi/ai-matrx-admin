"use client";

import { RotateCcw } from "lucide-react";

import { Badge, type BadgeTone } from "@ai-matrx/design-system/controls";

import { reviewStatusLabel } from "../model";

const TONE: Record<string, BadgeTone> = {
  open: "warning",
  acknowledged: "info",
  fixed: "success",
  ignored: "neutral",
};

/** An issue's status, plus "Came back ×N" when a fixed issue reopened. */
export function IssueStatusBadge({
  status,
  reopenedCount,
}: {
  status: string;
  reopenedCount: number;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Badge tone={TONE[status] ?? "neutral"}>{reviewStatusLabel(status)}</Badge>
      {status === "fixed" ? (
        <Badge tone="neutral" title="Reopens by itself if it happens again">
          Watching
        </Badge>
      ) : null}
      {reopenedCount > 0 ? (
        <Badge
          tone="destructive"
          icon={<RotateCcw className="h-3 w-3" />}
          title={`Came back ${reopenedCount} ${reopenedCount === 1 ? "time" : "times"} after a fix`}
        >
          {reopenedCount === 1 ? "Came back" : `Came back ×${reopenedCount}`}
        </Badge>
      ) : null}
    </span>
  );
}
