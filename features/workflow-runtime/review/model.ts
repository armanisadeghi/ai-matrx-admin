// features/workflow-runtime/review/model.ts
//
// Workflow REVIEW FLAGS, in the reader's words. A run that succeeds but needed
// something it should never have needed (a retry, a caught failure, a redo, a
// fallback…) writes a flagged `workflow.run_log` row; the database groups those
// rows into `workflow.review_issue` (one issue per definition + signature, many
// occurrences, reopened when a "fixed" issue happens again). Contract:
// aidream packages/matrx-graph/matrx_graph/db/migrations/0117_review_flags.sql.
//
// Pure — no React, no fetch.

import type { Database } from "@/types/database.types";

export type ReviewIssueRow = Database["workflow"]["Tables"]["review_issue"]["Row"];
export type RunLogRow = Database["workflow"]["Tables"]["run_log"]["Row"];

export type ReviewIssueStatus = "open" | "acknowledged" | "fixed" | "ignored";

export const REVIEW_CATEGORIES = [
  "recovered_error",
  "retry",
  "rework",
  "fallback",
  "validation_failed",
  "unexpected_path",
  "extra_cost",
  "degraded_output",
  "skipped_item",
  "human_handoff",
  "stall_recovery",
  "other",
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  recovered_error: "Recovered error",
  retry: "Retry",
  rework: "Rework",
  fallback: "Fallback",
  validation_failed: "Failed check",
  unexpected_path: "Unexpected path",
  extra_cost: "Extra cost",
  degraded_output: "Degraded output",
  skipped_item: "Skipped item",
  human_handoff: "Handed to a person",
  stall_recovery: "Stall recovered",
  other: "Other",
};

export function reviewCategoryLabel(category: string | null | undefined): string {
  if (!category) return "Other";
  return CATEGORY_LABEL[category] ?? humanize(category);
}

export const REVIEW_CATEGORY_OPTIONS = REVIEW_CATEGORIES.map((value) => ({
  value,
  label: reviewCategoryLabel(value),
}));

const STATUS_LABEL: Record<ReviewIssueStatus, string> = {
  open: "Open",
  acknowledged: "Seen",
  fixed: "Fixed",
  ignored: "Ignored",
};

export function reviewStatusLabel(status: string | null | undefined): string {
  return STATUS_LABEL[(status ?? "open") as ReviewIssueStatus] ?? humanize(status ?? "");
}

export const REVIEW_STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as ReviewIssueStatus[]).map(
  (value) => ({ value, label: STATUS_LABEL[value] }),
);

/** The engine's stable labels, in words. Author labels fall back to their key, humanized. */
const ENGINE_LABEL: Record<string, string> = {
  "engine.retry": "Step retried",
  "engine.caught_failure": "Failure caught",
  "engine.optional_step_failed": "Optional step failed",
  "engine.item_skipped": "Item skipped",
  "engine.output_shape": "Output shape off",
  "engine.human_handoff": "Handed to a person",
  "engine.stall_recovery": "Recovered from a stall",
  "response_check.revised": "Answer revised",
  "response_check.off_target": "Answer off target",
  "response_check.not_revisable": "Answer not revisable",
};

function humanize(key: string): string {
  const words = key.replace(/[._-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
}

/**
 * What happened, in words. `flagged_step.<node>` / `flagged_path.<edge>` are the
 * author's "review if this runs" marks — the step or connection name says it.
 */
export function reviewLabelText(
  label: string,
  stepName?: string | null,
): string {
  if (ENGINE_LABEL[label]) return ENGINE_LABEL[label];
  if (label.startsWith("flagged_step.")) return stepName ? `${stepName} ran` : "Flagged step ran";
  if (label.startsWith("flagged_path.")) return stepName ? `Path to ${stepName} taken` : "Flagged path taken";
  const tail = label.includes(".") ? label.slice(label.indexOf(".") + 1) : label;
  return humanize(tail);
}

/** A workflow's node id → its step name, from the definition's `nodes` array. */
export function stepNamesFromNodes(nodes: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(nodes)) return out;
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as { id?: unknown; data?: { label?: unknown; name?: unknown }; label?: unknown };
    if (typeof n.id !== "string") continue;
    const name = n.data?.label ?? n.data?.name ?? n.label;
    out[n.id] = typeof name === "string" && name.trim() ? name : humanize(n.id);
  }
  return out;
}

/** A flag's issue event, stamped by the database: new | reopened | repeat. */
export function issueEventOf(row: Pick<RunLogRow, "metadata">): string | null {
  const meta = row.metadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const v = (meta as Record<string, unknown>).issue_event;
    return typeof v === "string" ? v : null;
  }
  return null;
}
