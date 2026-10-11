// features/education/study/planner/__tests__/assignmentOverlay.test.tsx
//
// An open class assignment shows on its due date in the planner VIEW whatever
// plan is active — including one generated before the assignment existed or
// whose dates have all passed. Failed before the fix: PlanAgenda rendered only
// the plan's stored days/blocks, so an assignment due 2026-10-12 on a plan that
// ended 2026-10-04 appeared nowhere.

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

import { renderToStaticMarkup } from "react-dom/server";
import { PlanAgenda } from "../components/PlanAgenda";
import {
  assignmentOverlay,
  planHasEnded,
  type PlanAssignment,
} from "../assignmentBlocks";
import type { PlanWithDays, StudyPlanBlockRow, StudyPlanDayRow } from "../types";

const due: PlanAssignment = {
  title: "Cell deck",
  className: "Bio 101",
  dueDate: "2026-10-12",
  href: "/education/flashcards/abc/study",
};

function day(id: string, date: string): StudyPlanDayRow {
  return {
    id,
    day_date: date,
    is_rest_day: false,
    target_minutes: 30,
    rationale: null,
  } as unknown as StudyPlanDayRow;
}

function block(id: string, dayId: string, href: string): StudyPlanBlockRow {
  return {
    id,
    day_id: dayId,
    label: "Scheduled",
    target_kind: "custom",
    target_ref: { href },
    estimated_minutes: 15,
    estimated_items: null,
    rationale: null,
    status: "pending",
  } as unknown as StudyPlanBlockRow;
}

const stalePlan: PlanWithDays = {
  plan: { id: "p1", daily_minutes: 30 } as unknown as PlanWithDays["plan"],
  days: [
    { day: day("d1", "2026-10-03"), blocks: [] },
    { day: day("d2", "2026-10-04"), blocks: [] },
  ],
};

const noop = () => {};

describe("assignment overlay on the planner view", () => {
  it("a due date outside the plan gets its own entry", () => {
    const o = assignmentOverlay(["2026-10-03", "2026-10-04"], [], [due]);
    expect(o.onPlanDay).toEqual({});
    expect(o.offPlan).toEqual([{ date: "2026-10-12", items: [due] }]);
  });

  it("a due date on a plan day rides on that day; an already-scheduled href is not repeated", () => {
    expect(assignmentOverlay(["2026-10-12"], [], [due]).onPlanDay).toEqual({
      "2026-10-12": [due],
    });
    const scheduled = assignmentOverlay(["2026-10-12"], [due.href as string], [due]);
    expect(scheduled.onPlanDay).toEqual({});
    expect(scheduled.offPlan).toEqual([]);
  });

  it("undated assignments are not placed", () => {
    const o = assignmentOverlay([], [], [{ ...due, dueDate: null }]);
    expect(o.offPlan).toEqual([]);
  });

  it("knows when every plan day has passed", () => {
    expect(planHasEnded(["2026-10-03", "2026-10-04"], "2026-10-10")).toBe(true);
    expect(planHasEnded(["2026-10-03", "2026-10-12"], "2026-10-10")).toBe(false);
    expect(planHasEnded([], "2026-10-10")).toBe(false);
  });

  it("PlanAgenda shows the assignment for a plan whose dates have all passed", () => {
    const html = renderToStaticMarkup(
      <PlanAgenda
        plan={stalePlan}
        assignments={[due]}
        onBlockStatus={noop}
        onAddBlock={noop}
        onEditBlock={noop}
        onDeleteBlock={noop}
      />,
    );
    expect(html).toContain("Cell deck · Bio 101");
  });

  it("PlanAgenda does not repeat an assignment the plan already scheduled", () => {
    const plan: PlanWithDays = {
      ...stalePlan,
      days: [{ day: day("d3", "2026-10-12"), blocks: [block("b1", "d3", due.href as string)] }],
    };
    const html = renderToStaticMarkup(
      <PlanAgenda
        plan={plan}
        assignments={[due]}
        onBlockStatus={noop}
        onAddBlock={noop}
        onEditBlock={noop}
        onDeleteBlock={noop}
      />,
    );
    expect(html).not.toContain("Cell deck · Bio 101");
    expect(html).toContain("Scheduled");
  });
});
