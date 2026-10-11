// features/education/study/planner/assignmentBlocks.ts
//
// Class assignments → dated plan blocks. Pure (no I/O).
//
// There is ONE plan path: assignments ride in on the same `PlanSummary` both
// generators read (collectPlanSummary loads them), and `placeAssignments` runs
// on the draft EITHER generator emits — the deterministic builder and the
// planner agent's coerced output alike — so a teacher's due date is in the plan
// no matter which generator produced it. A block the agent already scheduled
// for the same link is never duplicated.
//
// Placement: on the due date when it is a study day inside the window; else
// the nearest study day before it; an overdue assignment goes on the first
// study day. One due after the plan ends is outside the plan and skipped.

import type { PlanBlockDraft, PlanDraft } from "./types";

/** One open class assignment, as the planner needs it (plain, storable data). */
export interface PlanAssignment {
  title: string;
  className: string;
  /** ISO date (YYYY-MM-DD) or null (undated assignments are not scheduled). */
  dueDate: string | null;
  /** Opens the assigned work. */
  href: string | null;
}

const ASSIGNMENT_MINUTES = 15;

export function assignmentBlockLabel(a: PlanAssignment): string {
  return `${a.title} · ${a.className}`;
}

export function placeAssignments(
  draft: PlanDraft,
  assignments: PlanAssignment[] | undefined,
): PlanDraft {
  const dated = (assignments ?? []).filter(
    (a): a is PlanAssignment & { dueDate: string } => !!a.dueDate && !!a.href,
  );
  if (dated.length === 0) return draft;

  const days = draft.days.map((d) => ({
    ...d,
    blocks: d.blocks.map((b) => ({ ...b })),
  }));
  const studyDays = days
    .filter((d) => !d.isRestDay)
    .sort((a, b) => a.dayDate.localeCompare(b.dayDate));
  if (studyDays.length === 0) return draft;

  const scheduledHrefs = new Set(
    days.flatMap((d) =>
      d.blocks.map((b) => b.targetRef?.href).filter((h): h is string => !!h),
    ),
  );

  for (const a of dated) {
    if (scheduledHrefs.has(a.href as string)) continue;
    const due = a.dueDate.slice(0, 10);
    if (due > draft.endDate) continue;
    // Last study day on or before the due date; overdue → first study day.
    const onOrBefore = studyDays.filter((d) => d.dayDate <= due);
    const day = onOrBefore[onOrBefore.length - 1] ?? studyDays[0];
    const block: PlanBlockDraft = {
      dayDate: day.dayDate,
      targetKind: "custom",
      itemType: null,
      targetRef: { href: a.href as string },
      label: assignmentBlockLabel(a),
      estimatedMinutes: ASSIGNMENT_MINUTES,
      ordering: -1,
      rationale:
        due < studyDays[0].dayDate
          ? `Assigned in ${a.className} — overdue since ${due}.`
          : `Assigned in ${a.className} — due ${due}.`,
    };
    // Teacher-assigned work leads the day.
    day.blocks.unshift(block);
    day.blocks.forEach((b, i) => {
      b.ordering = i;
    });
    day.targetMinutes += ASSIGNMENT_MINUTES;
    scheduledHrefs.add(a.href as string);
  }

  return { ...draft, days };
}
