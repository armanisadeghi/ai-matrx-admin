"use client";

// /workflows/review — every review issue the person can see, across every
// workflow and every organization they belong to. 🚨 Never filtered by the
// active organization: the on-page organization filter (?org_filter=,
// default All organizations) is the only narrowing (access ladder).

import { useEffect, useState } from "react";
import { Flag, ListOrdered } from "lucide-react";

import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { TapTargetButton } from "@ai-matrx/design-system/tap-target";
import { ReadFailure } from "@ai-matrx/design-system";
import { EntityOrgFilter } from "@/lib/entity-list/components/EntityOrgFilter";
import { useOrgFilterParam } from "@/lib/entity-list/orgFilterUrl";

import type { ReviewIssueRow } from "../model";
import {
  fetchInboxIssues,
  fetchWorkflowSummaries,
  type WorkflowSummary,
} from "../service";
import { issueView, ReviewIssuesTable } from "./ReviewIssuesTable";

export function ReviewInboxPage() {
  const [orgFilter, setOrgFilter] = useOrgFilterParam();
  const [issues, setIssues] = useState<ReviewIssueRow[]>([]);
  const [summaries, setSummaries] = useState<Map<string, WorkflowSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void fetchInboxIssues(orgFilter)
      .then(async (rows) => {
        const names = await fetchWorkflowSummaries(rows.map((r) => r.definition_id));
        if (!live) return;
        setIssues(rows);
        setSummaries(names);
        setError(null);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e : new Error("Could not read your issues."));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [orgFilter, attempt]);

  const onChanged = (next: ReviewIssueRow) =>
    setIssues((rows) => rows.map((r) => (r.id === next.id ? next : r)));

  const rows = issues.map((issue) => issueView(issue, summaries.get(issue.definition_id)));

  return (
    <>
      <RouteHeader
        left={
          <div className="flex min-w-0 items-center">
            <ChevronLeftTapButton href="/workflows/all" ariaLabel="Back to workflows" />
            <Flag className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="ml-1.5 min-w-0 truncate text-sm font-medium text-foreground">Review</span>
          </div>
        }
        right={
          <TapTargetButton
            href="/workflows/runs"
            ariaLabel="All runs"
            icon={<ListOrdered className="h-4 w-4" />}
          />
        }
      />
      <div className="h-full overflow-hidden">
        <div className="flex h-full flex-col overflow-y-auto pt-[var(--shell-header-h)]">
          {error ? (
            <ReadFailure error={error} what="your issues" onRetry={() => setAttempt((n) => n + 1)} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col" data-review-inbox="">
              <ReviewIssuesTable
                rows={rows}
                loading={loading}
                showWorkflow
                urlStateId="review-inbox"
                onChanged={onChanged}
                toolbarLeading={
                  <EntityOrgFilter
                    orgId={orgFilter}
                    onChange={(id) => {
                      setLoading(true);
                      setOrgFilter(id);
                    }}
                  />
                }
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
