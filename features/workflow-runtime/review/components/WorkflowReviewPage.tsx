"use client";

// /workflows/[id]/review — one workflow's review issues. Same chrome as the
// per-workflow runs list: RouteHeader (back to the workflow + name), one inner
// scroll area under the glass header.

import { useEffect, useState } from "react";
import { Flag, ListOrdered } from "lucide-react";

import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { TapTargetButton } from "@ai-matrx/design-system/tap-target";
import { ReadFailure } from "@ai-matrx/design-system";
import { AccessGate } from "@/features/access-gate/components/AccessGate";
import {
  workflowRunHref,
  workflowRunsListHref,
} from "@/features/workflow-runtime/browse/workflowActionRegistry";

import type { ReviewIssueRow } from "../model";
import { REVIEW_INBOX_HREF } from "../hrefs";
import {
  fetchWorkflowIssues,
  fetchWorkflowSummaries,
  type WorkflowSummary,
} from "../service";
import { issueView, ReviewIssuesTable } from "./ReviewIssuesTable";

export function WorkflowReviewPage({ definitionId }: { definitionId: string }) {
  const [summary, setSummary] = useState<WorkflowSummary | null>(null);
  const [missing, setMissing] = useState(false);
  const [issues, setIssues] = useState<ReviewIssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void Promise.all([fetchWorkflowSummaries([definitionId]), fetchWorkflowIssues(definitionId)])
      .then(([summaries, rows]) => {
        if (!live) return;
        const s = summaries.get(definitionId) ?? null;
        setSummary(s);
        setMissing(s === null);
        setIssues(rows);
        setError(null);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e : new Error("Could not read this workflow's issues."));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [definitionId, attempt]);

  const onChanged = (next: ReviewIssueRow) =>
    setIssues((rows) => rows.map((r) => (r.id === next.id ? next : r)));

  const rows = issues.map((issue) => issueView(issue, summary ?? undefined));

  return (
    <>
      <RouteHeader
        left={
          <div className="flex min-w-0 items-center">
            <ChevronLeftTapButton href={workflowRunHref(definitionId)} ariaLabel="Back to this workflow" />
            <Flag className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="ml-1.5 min-w-0 truncate text-sm font-medium text-foreground">
              {`${summary?.name ?? "Workflow"} · Review`}
            </span>
          </div>
        }
        right={
          <div className="flex items-center">
            <TapTargetButton
              href={workflowRunsListHref(definitionId)}
              ariaLabel="This workflow's runs"
              icon={<ListOrdered className="h-4 w-4" />}
            />
            <TapTargetButton
              href={REVIEW_INBOX_HREF}
              ariaLabel="Everything to review"
              icon={<Flag className="h-4 w-4" />}
            />
          </div>
        }
      />
      <div className="h-full overflow-hidden">
        <div className="flex h-full flex-col overflow-y-auto pt-[var(--shell-header-h)]">
          {missing ? (
            <AccessGate
              token="workflow"
              id={definitionId}
              onRetry={() => setAttempt((n) => n + 1)}
              fallbackHref={REVIEW_INBOX_HREF}
              fallbackLabel="Everything to review"
            />
          ) : error ? (
            <ReadFailure error={error} what="this workflow's issues" onRetry={() => setAttempt((n) => n + 1)} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col" data-workflow-review="">
              <ReviewIssuesTable
                rows={rows}
                loading={loading}
                urlStateId="workflow-review"
                onChanged={onChanged}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
