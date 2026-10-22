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
import { AccessGate } from "@ai-matrx/sharing/access/react";
import {
  workflowRunHref,
  workflowRunsListHref,
} from "@/features/workflow-runtime/browse/workflowActionRegistry";

import type { ReviewIssueRow } from "../model";
import { REVIEW_INBOX_HREF } from "../hrefs";
import {
  fetchWorkflowIssues,
  fetchWorkflowSummaries,
  REVIEW_ISSUE_LIMIT,
  setIssueStatus,
  type WorkflowSummary,
} from "../service";
import { issueView, ReviewIssuesTable } from "./ReviewIssuesTable";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { collectionWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import {
  createWorkflowReviewScope,
  WORKFLOW_REVIEW_SURFACE_NAME,
} from "@/features/surfaces/manifests/workflow-review.manifest";
import { issueSurfaceRow, parseIssueStatusChanges } from "../surface-writes";

export function WorkflowReviewPage({ definitionId }: { definitionId: string }) {
  const [summary, setSummary] = useState<WorkflowSummary | null>(null);
  const [missing, setMissing] = useState(false);
  const [issues, setIssues] = useState<ReviewIssueRow[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void Promise.all([fetchWorkflowSummaries([definitionId]), fetchWorkflowIssues(definitionId)])
      .then(([summaries, page]) => {
        if (!live) return;
        const s = summaries.get(definitionId) ?? null;
        setSummary(s);
        setMissing(s === null);
        setIssues(page.rows);
        setMore(page.more);
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

  // Surface `matrx-user/workflow-review`: what the table shows, and the row actions' own door.
  const getScope = () =>
    createWorkflowReviewScope({
      workflow_id: definitionId,
      workflow_name: summary?.name,
      review_load_status: missing ? "not_found" : error ? "failed" : loading ? "loading" : "loaded",
      issue_count: loading ? undefined : rows.length,
      open_issue_count: loading ? undefined : rows.filter((r) => r.status === "open").length,
      issues_capped: loading ? undefined : more,
      issues: loading ? undefined : rows.map(issueSurfaceRow),
    });
  const getWriteHandlers = () =>
    collectionWriteHandlers(
      {
        plural: "issues",
        singular: "issue",
        update: {
          parse: (value: unknown) => parseIssueStatusChanges("update_issues", value, issues),
          run: async (plan: ReturnType<typeof parseIssueStatusChanges>[number]) => {
            const next = await setIssueStatus(plan.id, plan.status, plan.note);
            onChanged(next);
            return { id: next.id, name: plan.name };
          },
          nameOf: (plan: ReturnType<typeof parseIssueStatusChanges>[number]) => plan.name,
          changedOf: (plan: ReturnType<typeof parseIssueStatusChanges>[number]) =>
            plan.note !== undefined ? ["status", "note"] : ["status"],
        },
      },
      refuseSurfaceWrite,
    );

  return (
    <SurfaceRuntimeProvider
      surfaceName={WORKFLOW_REVIEW_SURFACE_NAME}
      getScope={getScope}
      getWriteHandlers={getWriteHandlers}
    >
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
              {more ? (
                <p className="px-3 pb-1 text-xs text-muted-foreground" data-review-capped="">
                  {`Showing the newest ${REVIEW_ISSUE_LIMIT}`}
                </p>
              ) : null}
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
    </SurfaceRuntimeProvider>
  );
}
