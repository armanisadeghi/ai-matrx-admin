"use client";

// The run's review flags, INLINE in the hero's status row ("COMPLETED · 3 flagged"):
// the row is already on screen and keeps its height, so the flags arriving
// after their read never move the page (no-layout-shift law). The chip opens a
// popover with one line per flag — category, step, message, its issue — and a
// door to the workflow's review page. A failed read says so, with Retry.

import Link from "next/link";
import { Flag } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ai-matrx/design-system";
import { Badge } from "@ai-matrx/design-system/controls";

import { reviewCategoryLabel, reviewLabelText } from "../model";
import { reviewIssueHref, workflowReviewHref } from "../hrefs";
import type { RunFlag } from "../service";

export function RunReviewChip({
  flags,
  error,
  onRetry,
  definitionId,
  stepLabels,
}: {
  flags: readonly RunFlag[];
  error: string | null;
  onRetry: () => void;
  definitionId: string;
  stepLabels: Record<string, string>;
}) {
  if (error && flags.length === 0) {
    return (
      <span
        data-run-review-error=""
        className="inline-flex items-center gap-1 text-xs text-destructive"
        title={error}
      >
        <Flag className="h-3 w-3" aria-hidden />
        Flags unreadable
        <button
          type="button"
          onClick={onRetry}
          className="underline-offset-2 hover:underline"
        >
          Retry
        </button>
      </span>
    );
  }
  if (flags.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-run-review-banner=""
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-warning hover:underline"
        >
          <Flag className="h-3 w-3" aria-hidden />
          {flags.length} flagged
        </button>
      </PopoverTrigger>
      <PopoverContent surface="solid" align="start" width="md" padding="xs">
        <ul className="divide-y divide-border">
          {flags.map((flag) => {
            const step = flag.node_id ? (stepLabels[flag.node_id] ?? flag.node_id) : null;
            return (
              <li
                key={flag.id}
                data-run-flag={flag.id}
                className="flex min-w-0 items-center gap-2 px-1 py-1.5 text-xs"
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
        <div className="flex justify-end px-1 pt-1.5">
          <Link
            href={workflowReviewHref(definitionId)}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Review all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
