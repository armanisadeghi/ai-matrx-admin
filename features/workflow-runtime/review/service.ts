// features/workflow-runtime/review/service.ts
//
// Every read and write of workflow review flags — direct supabase-js, row
// security decides (a review issue inherits its workflow's access; a run's
// flags are readable by whoever can read the run). No server hop: these are
// plain table reads/writes.

import { supabase } from "@/utils/supabase/client";
import { postgrestError } from "@/lib/failure/postgrestError";
import type { LaneRow } from "@/lib/entity-list/laneRows";

import { stepNamesFromNodes, type ReviewIssueRow, type ReviewIssueStatus, type RunLogRow } from "./model";

/** The page size for one workflow's issues and the inbox. Issues are grouped, so few. */
export const REVIEW_ISSUE_LIMIT = 500;
/** One issue's occurrences, newest first. */
export const REVIEW_OCCURRENCE_LIMIT = 200;

export type RunFlag = Pick<
  RunLogRow,
  | "id"
  | "run_id"
  | "definition_id"
  | "node_id"
  | "edge_id"
  | "label"
  | "message"
  | "category"
  | "source"
  | "severity"
  | "issue_id"
  | "occurred_at"
  | "metadata"
>;

const FLAG_COLUMNS =
  "id, run_id, definition_id, node_id, edge_id, label, message, category, source, severity, issue_id, occurred_at, metadata";

/** The flags one run raised, in the order they happened. */
export async function fetchRunFlags(runId: string): Promise<RunFlag[]> {
  const { data, error } = await supabase
    .schema("workflow")
    .from("run_log")
    .select(FLAG_COLUMNS)
    .eq("run_id", runId)
    .eq("needs_review", true)
    .order("occurred_at", { ascending: true })
    .limit(REVIEW_OCCURRENCE_LIMIT);
  if (error) throw postgrestError(error, { action: "read this run's flags", fallback: "Could not read this run's flags." });
  return data ?? [];
}

const ISSUE_COLUMNS = "*";

/** A capped read: the newest `REVIEW_ISSUE_LIMIT` rows, and whether more exist. */
export interface IssuePage {
  rows: ReviewIssueRow[];
  more: boolean;
}

function capped(rows: ReviewIssueRow[] | null): IssuePage {
  const all = rows ?? [];
  return { rows: all.slice(0, REVIEW_ISSUE_LIMIT), more: all.length > REVIEW_ISSUE_LIMIT };
}

export async function fetchWorkflowIssues(definitionId: string): Promise<IssuePage> {
  const { data, error } = await supabase
    .schema("workflow")
    .from("review_issue")
    .select(ISSUE_COLUMNS)
    .eq("definition_id", definitionId)
    .is("deleted_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(REVIEW_ISSUE_LIMIT + 1);
  if (error) throw postgrestError(error, { action: "read this workflow's issues", fallback: "Could not read this workflow's issues." });
  return capped(data);
}

/**
 * The cross-workflow inbox: every issue the person can see, in every
 * organization (row security decides). `organizationId` is the on-page filter,
 * never the active organization.
 */
export async function fetchInboxIssues(organizationId: string | null): Promise<IssuePage> {
  let query = supabase
    .schema("workflow")
    .from("review_issue")
    .select(ISSUE_COLUMNS)
    .is("deleted_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(REVIEW_ISSUE_LIMIT + 1);
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw postgrestError(error, { action: "read your issues", fallback: "Could not read your issues." });
  return capped(data);
}

/** The inbox's lane reader rows (workflow.review_issue_list_lanes): (issue, lane, organization). */
export async function fetchReviewIssueLanes(): Promise<LaneRow[]> {
  const { data, error } = await supabase
    .schema("workflow")
    .rpc("review_issue_list_lanes", {});
  if (error) throw postgrestError(error, { action: "read your review lanes", fallback: "Could not read your review lanes." });
  return (data ?? []).map((r) => ({ id: r.id, lane: r.lane, organization_id: r.organization_id }));
}

export async function fetchIssue(issueId: string): Promise<ReviewIssueRow | null> {
  const { data, error } = await supabase
    .schema("workflow")
    .from("review_issue")
    .select(ISSUE_COLUMNS)
    .eq("id", issueId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw postgrestError(error, { action: "read this issue", fallback: "Could not read this issue." });
  return data;
}

export async function fetchIssueOccurrences(issueId: string): Promise<RunFlag[]> {
  const { data, error } = await supabase
    .schema("workflow")
    .from("run_log")
    .select(FLAG_COLUMNS)
    .eq("issue_id", issueId)
    .order("occurred_at", { ascending: false })
    .limit(REVIEW_OCCURRENCE_LIMIT);
  if (error) throw postgrestError(error, { action: "read this issue's occurrences", fallback: "Could not read this issue's occurrences." });
  return data ?? [];
}

/** Open issues on one workflow (the header link and the Review column agree: status = open). */
export async function fetchOpenIssueCount(definitionId: string): Promise<number> {
  const { count, error } = await supabase
    .schema("workflow")
    .from("review_issue")
    .select("id", { count: "exact", head: true })
    .eq("definition_id", definitionId)
    .eq("status", "open")
    .is("deleted_at", null);
  if (error) throw postgrestError(error, { action: "count this workflow's issues", fallback: "Could not count this workflow's issues." });
  return count ?? 0;
}

/** A workflow's name and its step names (node id → name), for issue rows. */
export interface WorkflowSummary {
  name: string;
  steps: Record<string, string>;
}

export async function fetchWorkflowSummaries(ids: string[]): Promise<Map<string, WorkflowSummary>> {
  const out = new Map<string, WorkflowSummary>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return out;
  const { data, error } = await supabase
    .schema("workflow")
    .from("definition")
    .select("id, name, nodes")
    .in("id", unique);
  if (error) throw postgrestError(error, { action: "read workflow names", fallback: "Could not read workflow names." });
  for (const row of data ?? []) out.set(row.id, { name: row.name, steps: stepNamesFromNodes(row.nodes) });
  return out;
}

/**
 * Acknowledge / Mark fixed / Ignore / Reopen. A "fixed" issue reopens itself
 * when it happens again — the database's run_log trigger does that.
 */
export async function setIssueStatus(
  issueId: string,
  status: ReviewIssueStatus,
  note?: string | null,
): Promise<ReviewIssueRow> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id ?? null;
  const patch: {
    status: ReviewIssueStatus;
    status_changed_at: string;
    status_changed_by: string | null;
    resolution_note?: string | null;
  } = {
    status,
    status_changed_at: new Date().toISOString(),
    status_changed_by: userId,
  };
  if (note !== undefined) patch.resolution_note = note && note.trim() ? note.trim() : null;
  const { data, error } = await supabase
    .schema("workflow")
    .from("review_issue")
    .update(patch)
    .eq("id", issueId)
    .select(ISSUE_COLUMNS)
    .maybeSingle();
  if (error) throw postgrestError(error, { action: "change this issue", fallback: "Could not change this issue." });
  if (!data) throw new Error("This issue could not be changed — you may only view it.");
  return data;
}
