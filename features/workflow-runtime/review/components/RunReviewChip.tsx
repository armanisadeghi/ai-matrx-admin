"use client";

// The run's review flags, INLINE in the hero's status row ("COMPLETED · 3 flagged"):
// the row is already on screen and keeps its height, so the flags arriving
// after their read never move the page (no-layout-shift law). The chip opens a
// popover with one line per flag — category, step, message, its issue — and a
// door to the workflow's review page. A failed read says so, with Retry.

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Flag } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ai-matrx/design-system";
import { Badge } from "@ai-matrx/design-system/controls";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

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
        <ErrorAlchemyMenu error={error} size="xs" />
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
    <RunFlagsPopover
      flags={flags}
      definitionId={definitionId}
      stepLabels={stepLabels}
      openFromUrl
      trigger={
        <button
          type="button"
          data-run-review-banner=""
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-warning hover:underline"
        >
          <Flag className="h-3 w-3" aria-hidden />
          {flags.length} flagged
        </button>
      }
    />
  );
}

/** `?flags=1` on the run page opens the flag list on arrival (the runs list's Flagged count links here). */
export const RUN_FLAGS_URL_PARAM = "flags";

/**
 * The ONE flag list: any trigger (the status-row chip, a step's flag marker) opens the same
 * popover — one line per flag (category, step → its issue, message) and "Review all".
 */
export function RunFlagsPopover({
  flags,
  definitionId,
  stepLabels,
  trigger,
  openFromUrl = false,
}: {
  flags: readonly RunFlag[];
  definitionId: string;
  stepLabels: Record<string, string>;
  trigger: ReactNode;
  openFromUrl?: boolean;
}) {
  const params = useSearchParams();
  const [open, setOpen] = useState(
    () => openFromUrl && params?.get(RUN_FLAGS_URL_PARAM) === "1",
  );
  if (flags.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent surface="solid" align="start" width="md" padding="xs">
        <ul className="divide-y divide-border">
          {flags.map((flag) => (
            <FlagLine
              key={flag.id}
              flag={flag}
              definitionId={definitionId}
              step={flag.node_id ? (stepLabels[flag.node_id] ?? flag.node_id) : null}
            />
          ))}
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

/** One flag: category, the step (the door to its issue), and the message — 3 lines, then "More". */
function FlagLine({
  flag,
  definitionId,
  step,
}: {
  flag: RunFlag;
  definitionId: string;
  step: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const message = flag.message || reviewLabelText(flag.label, step);
  const name = step ?? reviewLabelText(flag.label);
  const category = reviewCategoryLabel(flag.category);
  return (
    <li data-run-flag={flag.id} className="min-w-0 space-y-1 px-1 py-1.5 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <Badge tone="warning" className="shrink-0">
          {category}
        </Badge>
        {flag.issue_id ? (
          <Link
            href={reviewIssueHref(definitionId, flag.issue_id)}
            aria-label={`${category} · ${name}: open this issue`}
            title="Open this issue"
            className="min-w-0 truncate font-medium text-foreground hover:underline"
          >
            {name}
          </Link>
        ) : (
          <span className="min-w-0 truncate font-medium text-foreground">{name}</span>
        )}
      </div>
      <p className={expanded ? "text-muted-foreground" : "line-clamp-3 text-muted-foreground"}>
        {message}
      </p>
      {message.length > 140 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {expanded ? "Less" : "More"}
        </button>
      ) : null}
    </li>
  );
}
