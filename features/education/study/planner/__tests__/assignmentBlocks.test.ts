// features/education/study/planner/__tests__/assignmentBlocks.test.ts
//
// Class assignments reach the plan through BOTH generators: the deterministic
// builder places them itself, and the agent's coerced draft gets the same
// placement — so a teacher's due date is never lost to which generator ran.

import { buildPlan } from "../buildPlan";
import { coercePlanDraft } from "../coercePlan";
import { placeAssignments, type PlanAssignment } from "../assignmentBlocks";
import type { PlanInput } from "../types";

const input: PlanInput = {
  title: "Bio midterm",
  startDate: "2026-10-12", // Monday
  examDate: "2026-10-18", // Sunday
  dailyMinutes: 30,
  restDays: [6], // Saturday
};

const deck: PlanAssignment = {
  title: "Cell deck",
  className: "Bio 101",
  dueDate: "2026-10-14",
  href: "/education/flashcards/abc/study",
};

function blocksWithHref(days: { dayDate: string; blocks: { targetRef?: { href?: string }; label: string; rationale?: string | null }[] }[], href: string) {
  return days.flatMap((d) =>
    d.blocks
      .filter((b) => b.targetRef?.href === href)
      .map((b) => ({ day: d.dayDate, label: b.label, rationale: b.rationale })),
  );
}

describe("class assignments in the study plan", () => {
  it("the deterministic builder schedules an assignment on its due date with its class", () => {
    const draft = buildPlan(
      input,
      { dueCount: 0, weakCount: 0, assignments: [deck] },
      new Date(2026, 9, 12),
    );
    const placed = blocksWithHref(draft.days, deck.href as string);
    expect(placed).toEqual([
      {
        day: "2026-10-14",
        label: "Cell deck · Bio 101",
        rationale: "Assigned in Bio 101 — due 2026-10-14.",
      },
    ]);
  });

  it("the agent's draft gets the same block", () => {
    const draft = coercePlanDraft(
      {
        days: [
          { day_date: "2026-10-13", blocks: [{ label: "Review", target_kind: "review" }] },
          { day_date: "2026-10-14", blocks: [{ label: "Review", target_kind: "review" }] },
        ],
      },
      input,
      { dueCount: 0, weakCount: 0, assignments: [deck] },
    );
    expect(blocksWithHref(draft.days, deck.href as string)).toHaveLength(1);
    expect(blocksWithHref(draft.days, deck.href as string)[0].day).toBe("2026-10-14");
  });

  it("a due date on a rest day moves to the study day before; overdue goes first; past the plan is skipped", () => {
    const base = buildPlan(input, { dueCount: 0, weakCount: 0 }, new Date(2026, 9, 12));
    const draft = placeAssignments(base, [
      { ...deck, href: "/a", dueDate: "2026-10-17" }, // Saturday rest day
      { ...deck, href: "/b", dueDate: "2026-10-01" }, // overdue
      { ...deck, href: "/c", dueDate: "2026-11-30" }, // after the exam
      { ...deck, href: "/d", dueDate: null }, // undated
    ]);
    expect(blocksWithHref(draft.days, "/a")[0].day).toBe("2026-10-16");
    expect(blocksWithHref(draft.days, "/b")[0].day).toBe("2026-10-12");
    expect(blocksWithHref(draft.days, "/c")).toHaveLength(0);
    expect(blocksWithHref(draft.days, "/d")).toHaveLength(0);
  });

  it("never duplicates a block already scheduled for the same link", () => {
    const once = placeAssignments(
      buildPlan(input, { dueCount: 0, weakCount: 0 }, new Date(2026, 9, 12)),
      [deck],
    );
    const twice = placeAssignments(once, [deck]);
    expect(blocksWithHref(twice.days, deck.href as string)).toHaveLength(1);
  });
});
