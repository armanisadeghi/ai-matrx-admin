"use client";

// The run page's review-flag banner: "Completed · 3 flagged", then one line per
// flag — category, step, message, and the issue it belongs to. Renders nothing
// when the run raised no flags (no reserved space: a flag arrives only as the
// run settles, and a run without flags must read exactly as before).

import Link from "next/link";
import { Flag } from "lucide-react";

import { Badge } from "@ai-matrx/design-system/controls";

import { runStatusLabel } from "../../run-status";
import { reviewCategoryLabel, reviewLabelText } from "../model";
import { reviewIssueHref, workflowReviewHref } from "../hrefs";
import type { RunFlag } from "../service";

export function RunReviewBanner({
  flags,
  definitionId,
  runStatus,
  stepLabels,
}: {
  flags: readonly RunFlag[];
  definitionId: string;
  runStatus: string | null;
  stepLabels: Record<string, string>;
}) {
  if (flags.length === 0) return null;
  const status = runStatus ? runStatusLabel(runStatus) : "Run";
  return (
    <section
      data-run-review-banner=""
      className="overflow-hidden rounded-xl border border-warning/40 bg-card/40"
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Flag className="h-4 w-4 shrink-0 text-warning" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {status} · {flags.length} flagged
        </span>
        <Link
          href={workflowReviewHref(definitionId)}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Review
        </Link>
      </div>
      <ul className="divide-y divide-border/60">
        {flags.map((flag) => {
          const step = flag.node_id ? (stepLabels[flag.node_id] ?? flag.node_id) : null;
          return (
            <li
              key={flag.id}
              data-run-flag={flag.id}
              className="flex min-w-0 items-center gap-2 px-3 py-1.5 text-xs"
            >
              <Badge tone="warning" className="shrink-0">
                {reviewCategoryLabel(flag.category)}
              </Badge>
              <span className="shrink-0 font-medium text-foreground">
                {step ?? reviewLabelText(flag.label)}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground" title={flag.message}>
                {flag.message || reviewLabelText(flag.label, step)}
              </span>
              {flag.issue_id ? (
                <Link
                  href={reviewIssueHref(definitionId, flag.issue_id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground hover:underline"
                >
                  Issue
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
