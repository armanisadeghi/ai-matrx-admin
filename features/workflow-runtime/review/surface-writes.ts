// Agent writes on the review pages (surfaces `matrx-user/workflow-review` and
// `matrx-user/workflow-review-issue`): pure readers of the agent's value, and the
// row shape both surfaces emit. Saving goes through `setIssueStatus`, the door the
// row buttons use.

import {
  collectProblems,
  ListLevelProblem,
  ProblemList,
  readCollectionList,
  repeatsProblem,
} from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";

import { reviewCategoryLabel, type ReviewIssueRow, type ReviewIssueStatus } from "./model";
import type { IssueView } from "./components/ReviewIssuesTable";

const STATUSES: readonly ReviewIssueStatus[] = ["open", "acknowledged", "fixed", "ignored"];

/** One issue as the surfaces show it to an agent. */
export function issueSurfaceRow(view: IssueView) {
  return {
    id: view.id,
    what: view.what,
    where: view.where,
    category: reviewCategoryLabel(view.category),
    status: view.status,
    occurrences: view.occurrences,
    run_count: view.run_count,
    reopened_count: view.reopened_count,
    first_seen_at: view.first_seen_at,
    last_seen_at: view.last_seen_at,
    last_message: view.last_message,
    resolution_note: view.resolution_note,
  };
}

export interface IssueStatusChange {
  id: string;
  name: string;
  status: ReviewIssueStatus;
  /** Only with "fixed"; undefined leaves the saved note alone. */
  note?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read one { status, note? } object (the id is checked by the caller). */
export function readIssueStatus(target: string, raw: unknown): Pick<IssueStatusChange, "status" | "note"> {
  const problems = new ProblemList(target);
  if (!isRecord(raw)) throw new Error(`${target}: send an object like { "status": "fixed", "note": "…" }.`);
  const status = raw.status;
  if (typeof status !== "string" || !STATUSES.includes(status as ReviewIssueStatus)) {
    problems.add(`"status" must be one of ${STATUSES.map((s) => `"${s}"`).join(", ")}.`);
  }
  let note: string | null | undefined;
  if (raw.note !== undefined && raw.note !== null) {
    if (typeof raw.note !== "string") problems.add('"note" must be text.');
    else if (status !== "fixed") problems.add('"note" is only taken with "status": "fixed".');
    else note = raw.note;
  }
  for (const key of Object.keys(raw)) {
    if (!["id", "status", "note"].includes(key)) problems.add(`Unknown field "${key}".`);
  }
  problems.throwIfAny();
  return { status: status as ReviewIssueStatus, note };
}

/** update_issues: a list of { id, status, note? } against the issues on screen. */
export function parseIssueStatusChanges(
  target: string,
  value: unknown,
  issues: readonly ReviewIssueRow[],
): IssueStatusChange[] {
  const items = readCollectionList(target, "issues", value, 25);
  const byId = new Map(issues.map((i) => [i.id, i]));
  return collectProblems(
    target,
    items,
    (raw) => {
      const id = isRecord(raw) && typeof raw.id === "string" ? raw.id : null;
      const issue = id ? byId.get(id) : undefined;
      if (!issue) throw new ListLevelProblem(`Unknown issue id ${JSON.stringify(id)} — use an id from issues.`);
      return { id: issue.id, name: issue.label, ...readIssueStatus(target, raw) };
    },
    {
      nameOf: (raw) => (isRecord(raw) && typeof raw.id === "string" ? raw.id : null),
      listChecks: (checked) => [
        repeatsProblem(
          target,
          checked.map((c) => (isRecord(c.raw) && typeof c.raw.id === "string" ? c.raw.id : null)),
          "id",
        ),
      ],
    },
  );
}
