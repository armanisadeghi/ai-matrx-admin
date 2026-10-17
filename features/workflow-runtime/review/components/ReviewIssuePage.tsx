"use client";

// /workflows/[id]/review/[issueId] — ONE review issue: what it is, where, how
// often, its status and actions, and every occurrence (newest first), each
// opening its run. Notifications link here (in a new tab).

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, EyeOff, Flag, RotateCcw } from "lucide-react";

import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { Badge, Button, PropertyRow } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { AccessGate } from "@/features/access-gate/components/AccessGate";
import { workflowRunPermalinkHref } from "@/features/workflow-runtime/browse/workflowActionRegistry";

import { issueEventOf, reviewCategoryLabel, type ReviewIssueRow } from "../model";
import { workflowReviewHref } from "../hrefs";
import {
  fetchIssue,
  fetchIssueOccurrences,
  fetchWorkflowSummaries,
  type RunFlag,
  type WorkflowSummary,
} from "../service";
import { IssueStatusBadge } from "./IssueStatusBadge";
import { issueView } from "./ReviewIssuesTable";
import { useIssueActions } from "./useIssueActions";

const EVENT_WORD: Record<string, string> = { new: "First", reopened: "Came back", repeat: "Again" };

function when(value: string | null) {
  return value ? (
    <span title={new Date(value).toLocaleString()}>{formatRelativeTime(value)}</span>
  ) : null;
}

export function ReviewIssuePage({ definitionId, issueId }: { definitionId: string; issueId: string }) {
  const [issue, setIssue] = useState<ReviewIssueRow | null>(null);
  const [missing, setMissing] = useState(false);
  const [summary, setSummary] = useState<WorkflowSummary | undefined>(undefined);
  const [occurrences, setOccurrences] = useState<RunFlag[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { act, busyId, dialog } = useIssueActions((next) => setIssue(next));

  useEffect(() => {
    let live = true;
    void Promise.all([
      fetchIssue(issueId),
      fetchIssueOccurrences(issueId),
      fetchWorkflowSummaries([definitionId]),
    ])
      .then(([row, occ, summaries]) => {
        if (!live) return;
        // An issue read under another workflow's address is not this workflow's issue.
        const mine = row && row.definition_id === definitionId ? row : null;
        setIssue(mine);
        setMissing(mine === null);
        setOccurrences(occ);
        setSummary(summaries.get(definitionId));
        setError(null);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e : new Error("Could not read this issue."));
      });
    return () => {
      live = false;
    };
  }, [definitionId, issueId, attempt]);

  const view = issue ? issueView(issue, summary) : null;
  const busy = issue !== null && busyId === issue.id;

  let body: React.ReactNode;
  if (missing) {
    body = (
      <AccessGate
        token="workflow"
        id={definitionId}
        onRetry={() => setAttempt((n) => n + 1)}
        fallbackHref={workflowReviewHref(definitionId)}
        fallbackLabel="This workflow's issues"
      />
    );
  } else if (error) {
    body = <ReadFailure error={error} what="this issue" onRetry={() => setAttempt((n) => n + 1)} />;
  } else if (!view) {
    body = (
      <div className="mx-auto w-full max-w-4xl space-y-3 px-4 py-4">
        <div className="h-28 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  } else {
    body = (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-4" data-review-issue={view.id}>
        <section className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-foreground">{view.what}</h1>
            <IssueStatusBadge status={view.status} reopenedCount={view.reopened_count} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {view.status === "open" ? (
              <Button variant="outline" icon={<Check className="h-4 w-4" />} disabled={busy} onClick={() => act(view, "acknowledged")}>
                Mark seen
              </Button>
            ) : null}
            {view.status !== "fixed" ? (
              <Button variant="primary" icon={<CheckCheck className="h-4 w-4" />} disabled={busy} onClick={() => act(view, "fixed")}>
                Mark fixed
              </Button>
            ) : null}
            {view.status !== "ignored" ? (
              <Button variant="quiet" icon={<EyeOff className="h-4 w-4" />} disabled={busy} onClick={() => act(view, "ignored")}>
                Ignore
              </Button>
            ) : null}
            {view.status !== "open" ? (
              <Button variant="quiet" icon={<RotateCcw className="h-4 w-4" />} disabled={busy} onClick={() => act(view, "open")}>
                Reopen
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <PropertyRow label="Step" value={view.where} />
            <PropertyRow label="Category" value={reviewCategoryLabel(view.category)} />
            <PropertyRow label="Workflow" value={<Link href={`/workflows/${definitionId}`} className="hover:underline">{view.workflowName}</Link>} />
            <PropertyRow label="Times" value={<span className="tabular-nums">{view.occurrences}</span>} />
            <PropertyRow label="Runs" value={<span className="tabular-nums">{view.run_count}</span>} />
            <PropertyRow label="Came back" value={<span className="tabular-nums">{view.reopened_count}</span>} />
            <PropertyRow label="First seen" value={when(view.first_seen_at)} />
            <PropertyRow label="Last seen" value={when(view.last_seen_at)} />
            <PropertyRow label="Status changed" value={when(view.status_changed_at)} missing={!view.status_changed_at ? "Never" : undefined} />
          </div>
          <PropertyRow label="Latest message" value={view.last_message} missing={!view.last_message} />
          {view.resolution_note ? <PropertyRow label="Fix note" value={view.resolution_note} /> : null}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none hover:text-foreground">Details</summary>
            <div className="pt-2">
              <PropertyRow label="Key" value={view.label} mono />
            </div>
          </details>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <Flag className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-medium text-foreground">Occurrences</h2>
            <span className="text-xs tabular-nums text-muted-foreground">{occurrences.length}</span>
          </div>
          {occurrences.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">None recorded.</p>
          ) : (
            <ul className="divide-y divide-border" data-review-occurrences="">
              {occurrences.map((occ) => {
                const event = issueEventOf(occ);
                return (
                  <li key={occ.id} className="flex min-w-0 items-center gap-3 px-4 py-2 text-sm">
                    <span className="w-24 shrink-0 tabular-nums text-muted-foreground">{when(occ.occurred_at)}</span>
                    {event && EVENT_WORD[event] && event !== "repeat" ? (
                      <Badge tone={event === "reopened" ? "destructive" : "warning"} className="shrink-0">
                        {EVENT_WORD[event]}
                      </Badge>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-foreground" title={occ.message}>
                      {occ.message}
                    </span>
                    <Link
                      href={workflowRunPermalinkHref(occ.run_id)}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Open run
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <>
      <RouteHeader
        left={
          <div className="flex min-w-0 items-center">
            <ChevronLeftTapButton href={workflowReviewHref(definitionId)} ariaLabel="Back to this workflow's issues" />
            <Flag className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="ml-1.5 min-w-0 truncate text-sm font-medium text-foreground">
              {view ? `${view.workflowName} · ${view.what}` : "Issue"}
            </span>
          </div>
        }
      />
      <div className="h-full overflow-hidden">
        <div className="h-full overflow-y-auto pt-[var(--shell-header-h)]">{body}</div>
      </div>
      {dialog}
    </>
  );
}
