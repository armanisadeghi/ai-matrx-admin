"use client";

// /workflows/review — every review issue the person can see, across every
// workflow, in the platform's list lanes (All | Mine | My team | My Orgs |
// Shared | System) with the organization filter (default All organizations).
// 🚨 Never filtered by the active organization (access ladder). Lanes come from
// the lane reader workflow.review_issue_list_lanes — an issue sits in every
// lane its workflow sits in — so the tab counts equal the rows under them.

import { useEffect, useState } from "react";
import { Flag, ListOrdered } from "lucide-react";

import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { TapTargetButton } from "@ai-matrx/design-system/tap-target";
import { ReadFailure } from "@ai-matrx/design-system";
import { EntityLaneHeader } from "@/lib/entity-list/components/EntityLaneHeader";
import { laneIds } from "@/lib/entity-list/laneRows";
import { useLaneParam } from "@/lib/entity-list/useLaneParam";
import { useLaneRows } from "@/lib/entity-list/useLaneRows";
import { useOrgFilterParam } from "@/lib/entity-list/orgFilterUrl";
import {
  withStandardLanes,
  type LaneSupport,
  type ListScopeKind,
} from "@/lib/list-scope/types";

import type { ReviewIssueRow } from "../model";
import {
  fetchInboxIssues,
  fetchReviewIssueLanes,
  fetchWorkflowSummaries,
  REVIEW_ISSUE_LIMIT,
  type WorkflowSummary,
} from "../service";
import { issueView, ReviewIssuesTable } from "./ReviewIssuesTable";

/** A stranger's workflow issues are never readable, so Public is absent. */
const REVIEW_SCOPES: ListScopeKind[] = ["mine", "orgs", "shared", "system"];
const REVIEW_LANE_SUPPORT: LaneSupport = { public: false };
const REVIEW_LANES = withStandardLanes(REVIEW_SCOPES, { lanes: REVIEW_LANE_SUPPORT });

export function ReviewInboxPage() {
  const [lane, setLane] = useLaneParam("workflow", REVIEW_LANES);
  const [orgFilter, setOrgFilter] = useOrgFilterParam([]);
  const [attempt, setAttempt] = useState(0);
  const laneRows = useLaneRows(() => fetchReviewIssueLanes(), `review-lanes:${attempt}`);
  const [issues, setIssues] = useState<ReviewIssueRow[]>([]);
  const [more, setMore] = useState(false);
  const [summaries, setSummaries] = useState<Map<string, WorkflowSummary>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let live = true;
    void fetchInboxIssues(null)
      .then(async (page) => {
        const names = await fetchWorkflowSummaries(page.rows.map((r) => r.definition_id));
        if (!live) return;
        setIssues(page.rows);
        setMore(page.more);
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
  }, [attempt]);

  const onChanged = (next: ReviewIssueRow) =>
    setIssues((rows) => rows.map((r) => (r.id === next.id ? next : r)));

  const shown = laneRows.rows ? laneIds(laneRows.rows, lane, orgFilter) : null;
  const rows = shown
    ? issues
        .filter((issue) => shown.has(issue.id))
        .map((issue) => issueView(issue, summaries.get(issue.definition_id)))
    : [];
  const readError = error ?? (laneRows.error ? new Error(laneRows.error) : null);

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
          <EntityLaneHeader
            scopes={REVIEW_SCOPES}
            laneSupport={REVIEW_LANE_SUPPORT}
            lane={lane}
            onLaneChange={setLane}
            orgId={orgFilter}
            onOrgChange={setOrgFilter}
            laneRows={laneRows}
            className="px-3 pb-2"
          />
          {readError ? (
            <ReadFailure
              error={readError}
              what="your issues"
              onRetry={() => {
                setLoading(true);
                setAttempt((n) => n + 1);
              }}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col" data-review-inbox="">
              {more ? (
                <p className="px-3 pb-1 text-xs text-muted-foreground" data-review-capped="">
                  {`Showing the newest ${REVIEW_ISSUE_LIMIT}`}
                </p>
              ) : null}
              <ReviewIssuesTable
                rows={rows}
                loading={loading || laneRows.rows === null}
                showWorkflow
                urlStateId="review-inbox"
                onChanged={onChanged}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
